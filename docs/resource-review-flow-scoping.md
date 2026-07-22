# Scoping: Crowdsourced Resource Review Flow

Status: Draft for discussion
Owner: TBD
Related: README's "Review and approve/reject suggested edits," "View and resolve reports," "View resource changelogs and roll back changes"

## 1. Goal

Let admins review, approve, or reject crowdsourced submissions (new resources, edits to
existing resources, and reports flagging problems with a resource) before they affect the
live PHLask map, and keep a rollback-able version history of every resource.

## 2. Current state (verified against the codebase, 2026-07-07)

**admin-dashboard** (this repo): Supabase client + auth are wired up. A `resources` table
and matching `ResourceEntry` type exist (`app/types/ResourceEntry.ts`). One CRUD API
(`app/api/resources/methods.ts`) against that table only. No review UI, no edits/reports/
history tables, no roles. The dashboard route tree currently has a single placeholder
Dashboard page.

**phlask-map** (sibling repo, the live community-facing app): "Add Resource" is fully built
and inserts **directly into the live `resources` table** — no staging step. "Suggest Edit"
is a menu item with an unimplemented handler (`// TODO`). "Report" has no handler at all.
There is no `edits`/`suggestions`/`reports` table anywhere, and no existing concept of
linking a proposed change to a `resource_id`. The only edit mechanism today is a
password-gated `VerificationButton` that upserts straight onto the live row, bypassing
any review step.

**Conclusion:** everything below is greenfield. This doc scopes the admin-dashboard side
in full (schema, review UI, approve/reject, versioning) and defines the data contract
phlask-map must satisfy — it does not design phlask-map's Suggest Edit / Report form UX,
which is a separate scoping effort in that repo.

## 3. Out of scope for this doc

- phlask-map UI/UX for the Suggest Edit and Report forms (tracked as a dependency, §7).
- Notifying submitters of approval/rejection (no submitter accounts exist today).
- Reversing the `VerificationButton` bypass path in phlask-map (flagged as a risk, §8).

## 4. Proposed data model (Supabase / Postgres)

### 4.1 `resource_submissions`
Unified staging table for both new-resource and edit-to-existing submissions — matches
the diagram's single "Resources Table(s)" feeding two dashboard views via a discriminator.

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `submission_type` | `'NEW' \| 'EDIT'` | set by auto-matching (§5.1) |
| `target_resource_id` | uuid, nullable, FK → resources.id | set for EDIT; null for NEW |
| `match_confidence` | numeric, nullable | populated when matched automatically rather than by explicit resource_id |
| `proposed_data` | jsonb | full `ResourceEntry`-shaped payload |
| `source` | jsonb | submitter contact/context, if any (phlask-map has no submitter accounts today) |
| `status` | `'PENDING' \| 'APPROVED' \| 'REJECTED'` | soft-delete on reject, not a hard delete |
| `rejection_reason` | text, nullable | |
| `reviewed_by` | uuid, nullable, FK → admin user | |
| `reviewed_at` | timestamptz, nullable | |
| `created_at` | timestamptz | |

### 4.2 `resource_reports`
| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `resource_id` | uuid, FK → resources.id | |
| `report_type` | `'CLOSED' \| 'INACCURATE' \| 'INAPPROPRIATE' \| 'OTHER'` | |
| `description` | text | |
| `source` | jsonb | submitter contact/context, optional |
| `status` | `'PENDING' \| 'RESOLVED' \| 'DISMISSED'` | |
| `resolution_notes` | text, nullable | |
| `resolved_by` | uuid, nullable, FK → admin user | |
| `resolved_at` | timestamptz, nullable | |
| `created_at` | timestamptz | |

### 4.3 `resource_history`
Linear, append-only version log. A rollback writes a **new** version that copies an old
snapshot forward (like a revert commit) rather than mutating history — this is what the
diagram's "Git logic as instance saving" annotation is read as here; full branch/merge
semantics are out of scope per your answer.

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `resource_id` | uuid, FK → resources.id | |
| `version` | int | matches `resources.version`, increments monotonically |
| `snapshot` | jsonb | full `ResourceEntry` at this version |
| `change_source` | `'SUBMISSION_APPROVAL' \| 'ADMIN_DIRECT_EDIT' \| 'ROLLBACK'` | |
| `changed_by` | uuid, FK → admin user | |
| `source_submission_id` | uuid, nullable, FK → resource_submissions.id | traceability back to the approved submission |
| `created_at` | timestamptz | |

### 4.4 `admin_roles`
Per your answer, v1 needs more than one permission level.

| column | type | notes |
|---|---|---|
| `user_id` | uuid, FK → auth.users | |
| `role` | `'REVIEWER' \| 'ADMIN'` | REVIEWER: approve/reject submissions & reports. ADMIN: also rollback history, manage roles |

Open question: does this need a third tier, or is Reviewer/Admin sufficient for launch?

## 5. Flow

### 5.1 Intake & classification
1. phlask-map writes a row to `resource_submissions` (contract in §7) instead of directly
   to `resources`.
2. A Postgres trigger or Supabase Edge Function runs automatic matching: if
   `target_resource_id` wasn't supplied, match on proximity (lat/lng within a threshold)
   + name similarity against existing `resources`. Strong match → `submission_type = EDIT`,
   `target_resource_id` set, `match_confidence` recorded. No match → `submission_type = NEW`.
   Reviewers can override this classification in the UI regardless of the auto-tag.
3. `resource_reports` rows land directly (no classification needed, already tied to a
   `resource_id`).

### 5.2 Review queues (admin-dashboard UI)
Three queues, matching the diagram's split dashboard views plus Reports:
- **New Resources** — `resource_submissions` where `submission_type = NEW`, `status = PENDING`
- **Resource Edits** — `resource_submissions` where `submission_type = EDIT`, `status = PENDING`
- **Reports** — `resource_reports` where `status = PENDING`

### 5.3 Review detail / "In Review" mode
For an EDIT: side-by-side diff of existing `resources` row vs. `proposed_data` (the
diagram's "Existing site data" / "Suggested site data" panes), field-by-field.
For a NEW resource: single preview of `proposed_data` (nothing to diff against), plus a
flag if `match_confidence` was borderline so the reviewer can manually link it to an
existing resource instead of creating a duplicate.
For a Report: resource context + report description, with Resolve/Dismiss actions.

Actions:
- **Approve** — NEW: insert into `resources`, create `resource_history` v1.
  EDIT: update `resources` row, increment `resources.version`, append `resource_history`
  entry. Either way, mark the submission `APPROVED`.
- **Reject** — mark `resource_submissions.status = REJECTED` with reason; no changes to
  `resources`. Row is kept, not deleted (audit trail).
- **Resolve / Dismiss** (reports) — mark `resource_reports.status`; resolving a report does
  not itself change the resource — a follow-up edit/verification does that separately.

### 5.4 History & rollback
Per resource, a version timeline view backed by `resource_history`. Selecting an older
version and confirming "Roll back" writes a new `resource_history` row (and updates
`resources`) whose snapshot equals the selected old version — preserving full lineage
rather than deleting intervening history.

## 6. Admin-dashboard scope (this repo)

New routes (under the existing authenticated layout):
- `/reviews/new-resources`, `/reviews/edits`, `/reviews/reports` — queues
- `/reviews/submissions/:id` — diff/detail + approve/reject
- `/reviews/reports/:id` — report detail + resolve/dismiss
- `/resources/:id/history` — version timeline + rollback

New Supabase tables: `resource_submissions`, `resource_reports`, `resource_history`,
`admin_roles` (§4), plus RLS policies scoping writes to authenticated admins and
role-gating rollback to `ADMIN`.
`@tanstack/react-table` is already installed and unused — natural fit for the three queues.

## 7. Contract required from phlask-map (tracked as external dependency, not designed here)

- "Add Resource" must stop inserting directly into `resources`; it inserts into
  `resource_submissions` with `submission_type = 'NEW'`, `target_resource_id = null`.
- "Suggest Edit" must be implemented: inserts into `resource_submissions` with
  `submission_type = 'EDIT'`, `target_resource_id` set to the resource being edited,
  `proposed_data` containing only the changed fields merged over current values (exact
  merge strategy TBD with phlask-map team).
- "Report" must be implemented: inserts into `resource_reports` with `resource_id` and
  `report_type`.
- The `VerificationButton` direct-upsert bypass either needs to be retired in favor of
  this flow, or explicitly kept as an admin-only fast path (decide in §8).

## 8. Open questions / risks

- **`VerificationButton` bypass**: phlask-map already has a password-gated direct-edit
  path that writes straight to `resources`, skipping review and history entirely. Does
  this get retired, or coexist? If it coexists, `resource_history` will have gaps.
  **Needs a decision before this ships**, since it undermines the "every change has a
  version + audit trail" guarantee.
- **Matching threshold**: what proximity/name-similarity threshold counts as a confident
  auto-match for NEW vs EDIT classification? Needs tuning against real data, likely a
  follow-up spike rather than something to nail down in this doc.
- **Admin role bootstrap**: who assigns the first `ADMIN` role, and how (manual SQL vs. a
  seed script)?
- **Duplicate resources already in the wild**: since Add Resource has been inserting
  directly with no dedup, is a one-time cleanup pass needed before this launches?

## 9. Suggested phasing

1. Schema + RLS (`resource_submissions`, `resource_reports`, `resource_history`, `admin_roles`)
2. Review queues + detail/diff view + approve/reject (New Resources, Resource Edits)
3. History timeline + rollback
4. Reports queue
5. Coordinate with phlask-map team on the intake contract (§7) — can happen in parallel
   with 1–3 once the schema is settled
