# Next Up

Working list of the next pieces to tackle. Companion to `implementation-progress.md`
(build log) and `resource-review-flow-scoping.md` (original flow scoping doc, now
partly superseded by the `resource_edits` migration — see item 1).

## 1. Verify `resources` / `resource_revisions` schemas match — DONE (2026-07-28)

Checked live Supabase (anon key, REST probing — no service-role/DDL access available,
same constraint noted in `implementation-progress.md`).

- `resources`: 952 rows. Columns: `address, bathroom, city, creator, date_created,
  description, entry_type, food, forage, gp_id, guidelines, hours, id, images,
  last_modified, last_modifier, latitude, longitude, name, resource_type, source,
  state, status, verification, version, water, zip_code`.
- `resource_revisions`: 4 rows (no longer empty — some test/seed rows exist now).
  Exact same columns as `resources`, **plus** `mapped_resource` and
  `mapped_resources` (the FK'd one is `mapped_resources`, plural — confirmed still
  true, still confusingly named). `status` still does double duty (review status
  here vs. operational status on `resources`). Matches `app/types/ResourceRevision.ts`
  and the discovery notes in `implementation-progress.md` exactly — no drift.
- `resource_edits` (from the `20260714231214_resource_editing.sql` migration): table
  exists live and its full column list matches the migration file exactly (0 rows).
  **Not yet wired to any app code or UI** — only `resource_revisions` is used by
  `app/api/resource-revisions/methods.ts` and the `/reviews` routes today.

Open question this raises: **two parallel staging tables now exist**
(`resource_revisions`, actively used by the UI; `resource_edits`, migrated in #24 but
unused). Need a decision on which one this app builds forward on before doing more
work here — items 3-5 below assume that's settled first.

**Decision (2026-07-28): migrate to `resource_edits`.** It already ships the
approve/reject/rollback RPCs, the new-resource (`mapped_resource IS NULL`) path, and
ready-made review-queue views (`resource_edits_queue`, `new_resources_queue`,
`resource_edit_counts`, `resource_change_log`) — most of items 2 and 3's plumbing
already exists in Supabase and just needs wiring into the app. `resource_revisions`
gets left alone (per the migration's own comment) but the app stops reading from it.

## 2. Point approved edits to go live in `resources` — DONE (2026-07-28)

`/reviews` and `/reviews/:id` are now fully migrated off `resource_revisions` onto
`resource_edits`:
- `app/api/resource-edits/methods.ts` (new) wraps `resource_edits_queue`,
  `new_resources_queue`, and the `approve_edit`/`reject_edit` RPCs.
- `/reviews` loader now merges the edit queue and new-resource queue into one table,
  with a "Kind" (New/Edit) column.
- `/reviews/:id` approve/reject now call the real RPCs (capturing the reviewer's email
  from `context.get(userContext)`), so approving an edit actually applies it to
  `resources` — the change is now live for `phlask-map` to read. Rejecting a
  brand-new-site submission correctly skips the "resource not found" diff warning.
- `app/routes/authenticated/dashboard.tsx` also migrated; "Top approvers" is unlocked
  since `resource_edits.reviewed_by` exists (it never existed on `resource_revisions`).
- `app/api/resource-revisions/` and `app/types/ResourceRevision.ts` deleted — nothing
  references them anymore.
- **Needs a manual step**: `supabase/migrations/20260728000000_resource_edits_update_policy.sql`
  adds the UPDATE policy `resource_edits` was missing for `authenticated` (PENDING rows
  only) — without it, "Save changes" on the detail page silently no-ops under RLS. This
  repo only has the anon key here, so it hasn't been applied to the live DB yet — run it
  via the Supabase SQL editor or CLI with an owner/service-role credential.
- `phlask-map` (sibling repo) reads live map data straight from `resources` already, so
  no phlask-map-side change needed for data to *appear* — still worth confirming
  phlask-map has no caching layer that would delay visibility.

## 3. New resource vs. editing existing resource — flow logic

Review-side queues for both cases now exist (see item 2 — `/reviews` shows both, with
brand-new submissions using `new_resources_queue` and a null `mapped_resource`).
Remaining piece:
- The submission-side distinction in `phlask-map` (currently "Add Resource" inserts
  directly into `resources`; "Suggest Edit" is still a `// TODO` per the scoping doc) —
  that repo needs to start writing brand-new submissions into `resource_edits` with
  `mapped_resource = null` instead of inserting directly into `resources`, for this
  queue to actually receive anything.

## 4. Duplicate-detection / confidence rating for new resources

When a "new resource" submission comes in, compare it against existing points of the
same `resource_type` already in `resources` (and pending ones in the revisions/edits
table) to flag likely duplicates before a reviewer wastes time on it. Needs:
- A similarity scoring approach — geographic proximity (lat/lng distance) combined
  with field similarity (name, address, resource_type) — producing a confidence score,
  not just a boolean.
- A threshold/UI treatment for "likely duplicate, needs a merge decision" vs. "clean
  new submission."
- The scoping doc sketches this as `match_confidence` on a submission row (§4.1, §5.1)
  but that was written against the doc's *proposed* schema, not the real
  `resource_revisions`/`resource_edits` tables — needs re-grounding against whichever
  table item 1 settles on.

## 5. Map view + street view during resource validation

Add a map view (and Street View / imagery) to the `/reviews/:id` detail page so a
reviewer can visually confirm a submission's location without leaving the dashboard.
Needs a maps provider decision (Google Maps JS API for Street View compatibility is
the likely fit, given `gp_id` — Google Places ID — already exists on the resource
schema) and an API key.

## Sequencing note

Items 2-5 all sit downstream of the item-1 decision (which staging table survives:
`resource_revisions` or `resource_edits`). Worth resolving that first rather than
building item 2 or 4 twice.
