# Implementation Progress

Running log of build work, piece by piece. Companion to
`resource-review-flow-scoping.md` (which scopes the review/moderation flow
itself) — this doc tracks whatever's actively being built, including
prerequisite work like auth that isn't part of that scoping doc.

## 2026-07-07 — Login / auth pages redesign

**Status:** Done.

**What changed:**
- `app/routes/unauthenticated/_layout.tsx` — replaced the reused
  dashboard-sidebar shell with a centered auth-card layout (logo above a
  bordered `Paper`-style card), standard pattern for auth screens instead of
  a half-populated dashboard sidebar.
- `app/routes/unauthenticated/login.tsx` — added a password visibility
  toggle, an MUI `Alert` for Supabase sign-in errors (was a plain caption),
  and a "Forgot password?" link.
- Added a full forgot-password flow, since Supabase auth makes it nearly free
  and it's a standard expectation for a login page:
  - `app/routes/unauthenticated/forgot-password.tsx` — request form, calls
    `client.auth.resetPasswordForEmail`. Always shows a generic "check your
    email" confirmation regardless of whether the address exists, to avoid
    user enumeration (this is also just how Supabase's API behaves).
  - `app/routes/unauthenticated/confirm.tsx` — loader-only route. Supabase's
    SSR client uses the PKCE flow (`flowType: "pkce"`), so the recovery email
    link lands here with a `?code=` param; this route exchanges it for a
    session via `exchangeCodeForSession` and redirects to `reset-password`.
  - `app/routes/unauthenticated/reset-password.tsx` — new-password form
    (with confirm field + visibility toggle), calls `client.auth.updateUser`.
    Requires an active (recovery) session — loader redirects to
    forgot-password if there isn't one.
- New schemas: `app/schemas/forgot-password.ts`, `app/schemas/reset-password.ts`.
- `app/routes.ts` — registered `forgot-password`, `confirm`, `reset-password`
  under the existing `/auth` layout.

**Decisions made along the way:**
- After a successful password reset, the user lands signed in and is
  redirected straight to `/` rather than being forced to log in again —
  matches Supabase's own recommended pattern (the recovery session becomes a
  normal session once `updateUser` succeeds).
- Kept the existing `remix-forms` / `composable-functions` / zod pattern used
  by the original login page rather than introducing a different form
  approach, for consistency.

**Verified:**
- `pnpm typecheck` and `pnpm biome check` clean.
- Dev server smoke-tested via curl: `/auth`, `/auth/forgot-password` render
  200; `/auth/reset-password` and `/auth/confirm` correctly redirect to
  `/auth/forgot-password` when there's no recovery session/code; submitting
  bad credentials to the login action surfaces "Invalid login credentials"
  through the new Alert; submitting the forgot-password form renders the
  "Check your email" confirmation state.
- Not yet verified visually in an actual browser (no browser automation tool
  available in this session) — worth a manual pass before merging.

**Not done / explicitly out of scope for this pass:**
- Rate-limit/lockout-specific error copy (deferred per your answer).
- Any changes to the `VerificationButton` bypass or other items from
  `resource-review-flow-scoping.md` §8 — unrelated to this piece.

## 2026-07-07 — Resource edit review dashboard

**Status:** Done (approve/reject only — no propagation to `resources` yet, by design).

**Source-of-truth discovery:** the scoping doc's proposed schema
(`resource_submissions` etc.) doesn't exist yet — you pointed me at the
actual live table, `resource_revisions`, which already exists in Supabase.
Since there's no `information_schema` access via the publishable key, I
reverse-engineered its real shape via probing inserts/selects against the
REST API directly (and cleaned up the throwaway test rows after). Findings,
which differ from the scoping doc and are worth knowing for later phases:

- `resource_revisions` is shaped exactly like `resources`/`ResourceEntry`
  (same columns: `name`, `resource_type`, `address`, `water`/`food`/etc.) —
  it's a full proposed snapshot, not a sparse diff.
- No `submission_type` (NEW vs EDIT) column exists. Every row has a
  required, FK-enforced link to an existing resource (see below), so this
  table currently only models **edits to existing resources**, not
  brand-new resource submissions.
- The FK to `resources.id` is the confusingly-named `mapped_resources`
  column (plural, has the FK constraint). There's *also* a `mapped_resource`
  (singular) int column that's required (NOT NULL) but has no FK and isn't
  used by this feature — looks like schema cruft, left untouched.
- `status` is free text (no DB-level CHECK constraint) — this build treats
  it as `'PENDING' | 'APPROVED' | 'REJECTED'` by convention. Note this
  column does double duty awkwardly: on `resources` the same column name
  means operational status (OPERATIONAL/HIDDEN/etc.), but on
  `resource_revisions` it means review status — there's no separate column
  for "what operational status is being proposed."
- No `reviewed_by`, `reviewed_at`, or `rejection_reason` columns — reject
  is a bare status flip, no reason is captured today.
- `resources.id` / `resource_revisions.id` are plain integers, not uuids
  (despite `ResourceEntry.id` being typed `string` — pre-existing type/DB
  mismatch, not something this change touches).
- The table is currently empty in the live DB (phlask-map doesn't write to
  it yet, consistent with the scoping doc's §2 finding that "Suggest Edit"
  is still a TODO there).

**What changed:**
- `app/types/ResourceRevision.ts` — new type, `ResourceEntry` shape minus
  `id`/`status`, plus `id: number`, `mapped_resource`/`mapped_resources:
  number`, and `status: RevisionStatus`.
- `app/api/resource-revisions/methods.ts` — `getList` (optionally filtered
  by status, newest first), `getById`, `updateStatus`.
- `app/routes/authenticated/reviews/index.tsx` — queue page. Lists
  `PENDING` revisions in a sortable table (`@tanstack/react-table`, per the
  scoping doc's suggestion — first real use of that dependency), joined
  against `resources` for a human-readable "existing resource" label.
  Row click routes to the detail page. Handles the empty-queue state.
- `app/routes/authenticated/reviews/detail.tsx` — detail/diff page. Loads
  the revision plus its mapped `resources` row, renders a field-by-field
  table (Current vs Proposed) highlighting changed fields. Approve/Reject
  buttons post to the route's own action, which just flips
  `resource_revisions.status` — per your instruction, does **not** touch
  the live `resources` row or write any history yet. Handles the case
  where the mapped resource no longer exists.
- `app/routes.ts` — registered `reviews` (index) and `reviews/:id` (detail)
  under the authenticated layout.
- `app/routes/authenticated/_layout.tsx` — added a "Reviews" nav link.

**Decisions made along the way (flagging per your "design questions" carve-out):**
- Approve/Reject currently only updates `resource_revisions.status`. It does
  **not** write to `resources` or any history table — matches your explicit
  "don't worry about sending approved reviews anywhere for now." This means
  approving something here has no visible effect on the live map yet; that
  wiring is future work once the target (`resources` update? new
  `resource_history` table? something else?) is decided.
- Built one queue (edits to existing resources) rather than the doc's three
  (New Resources / Resource Edits / Reports), since `resource_revisions` as
  it actually exists can't represent "new resource" or "report" cases (no
  submission-type column, always FK'd to an existing resource, no reports
  table). If NEW-resource submissions or reports need a queue later, they'll
  need their own table(s) or a schema change to this one.
- Diff view compares against the *live* `resources` row at request time
  (not a snapshot), so if the underlying resource changes between
  submission and review, the diff reflects the current state, not what the
  submitter saw.

**Verified:**
- `pnpm typecheck` and `pnpm biome check` clean.
- Confirmed via direct REST calls against the Supabase table (not just
  reading code) that `resource_revisions`' real columns match what's coded
  above, and that inserts/updates against it behave as assumed.
- Dev server smoke test: `/reviews` and `/reviews/:id` both correctly
  302-redirect to `/auth` when unauthenticated (confirms the route-level
  `authMiddleware` is wired up). Did not verify the authenticated render
  path against a real logged-in session in this pass (no test credentials
  in hand) — worth a manual pass, same caveat as the login-page piece.

**Not done / explicitly out of scope for this pass:**
- Approve/Reject propagating to `resources` or `resource_history` — you
  said we'll figure that out later.
- New Resources queue, Reports queue, rollback/history timeline — blocked
  on schema that doesn't exist yet (see discovery notes above).
- `reviewed_by`/`rejection_reason` capture — no columns for it today.

## 2026-07-07 — Dashboard summary page

**Status:** Done, with one stat explicitly blocked on schema.

**What changed:**
- `app/routes/authenticated/dashboard.tsx` — replaced the placeholder with a
  real loader that fetches all `resource_revisions` and aggregates in JS
  (no DB-side aggregation available beyond REST filters): top 5 submitters
  by revision count, outstanding (`PENDING`) count per resource type (all
  four types always shown, defaulting to 0), plus pending/total stat cards.
- "Top approvers" is rendered but explicitly disabled with an explanatory
  tooltip: `resource_revisions` has no `reviewed_by` column, so there's no
  record of who approved/rejected a given revision. Can't add that column
  myself — no service-role key or DB connection string in `.env`, only the
  publishable key (REST-level CRUD, no DDL). Needs a schema change (add
  `reviewed_by`, set it in the approve/reject action) before this is
  buildable.

## 2026-07-07 — Editable review detail page

**Status:** Done.

**What changed:**
- `app/api/resource-revisions/methods.ts` — added `updateFields(id, values)`,
  a partial update against `resource_revisions` (separate from
  `updateStatus`, which only flips `status`).
- `app/routes/authenticated/reviews/detail.tsx` — rewritten. The Proposed
  column of the diff table is now editable (scalar fields as text/number/
  select inputs; water/food/forage/bathroom info as `Autocomplete` chip
  pickers scoped to the current `resource_type`, switching live if you
  change the type). Hours/images stay read-only — no editor UI for those
  yet. A "Save changes" button submits via `useFetcher` as a JSON body
  (`{ intent: "save", values }`); Approve/Reject remain plain `<Form>`
  FormData posts. The route's `action` dispatches on the request's
  `Content-Type` header to tell the two apart. Editing is only enabled
  while `status === "PENDING"` — approved/rejected revisions render
  read-only.
- Verified via `pnpm typecheck` / `pnpm biome check` (clean) and a curl
  smoke test against a locally-running dev server (temporarily disabling
  `authMiddleware`, then reverting): `/reviews`, `/reviews/15`,
  `/reviews/16`, `/reviews/17` all render 200 with no server-side errors,
  and a JSON POST of `{"intent":"save",...}` against revision 15 round-
  tripped through Supabase correctly ("Changes saved").

**Not done:** no diff/preview before saving, no undo — saving writes
directly to the revision row immediately.

## Fixed: "page freezes and crashes" when opening a review

**Status:** Done.

Reported symptom: clicking a resource in the reviews queue did nothing —
no navigation, no error page, just silence (a truer description than the
original "crash" framing). Root-caused this pass by installing Playwright
for real browser-level testing (no browser access in earlier passes, which
is why it went unresolved for two prior sessions).

**Root cause:** `app/middleware/auth.ts` exports `authMiddleware`, which
imports the genuinely server-only `~/api/client.server` (Supabase SSR
client + secrets). Every route using `export const middleware =
[authMiddleware]` (`reviews/index.tsx`, `reviews/detail.tsx`,
`dashboard.tsx`) therefore has a top-level `import { authMiddleware } from
"~/middleware/auth"` that's supposed to be stripped from the client bundle
(React Router auto-removes server-only route exports like `middleware`
from what ships to the browser). With `future.v8_splitRouteModules: true`
enabled in `react-router.config.ts`, that stripping silently failed in dev
mode: the browser's client-side navigation (clicking a row calls
`navigate()`, which lazy-loads the target route's module) ended up
requesting `/app/middleware/auth.ts` directly, which 500'd with "Server-only
module referenced by client" (Vite's guard against `.server.ts` code
reaching the client). The failed module load silently aborted the
navigation — URL never changed, UI appeared to do nothing, which read as a
freeze.

**Fix:** disabled the `v8_splitRouteModules` future flag in
`react-router.config.ts` (kept `v8_middleware` and `v8_viteEnvironmentApi`,
both still needed). This is an opt-in, still-evolving code-splitting
optimization for RR 7.13.0 — the more basic "strip server-only route
exports from the client bundle" mechanism it layers on top of works
correctly without it. Verified via Playwright: after the fix, `/app` no
longer appears in the browser's request graph for `auth.ts` at all, and
clicking a review row in `/reviews` correctly navigates to `/reviews/:id`
with no console errors, no failed requests, no error overlay. Also
confirmed `/` (dashboard) still loads and renders correctly.

**Not investigated further:** whether this is a known upstream bug in RR
7.13.0's `v8_splitRouteModules` + `v8_middleware` combination, or something
fixable by restructuring the import (e.g. not sharing a single
`authMiddleware` module across every leaf route file). Given
`v8_splitRouteModules` is purely a performance optimization (lazy-loads
`clientLoader`/`clientAction`/etc. into separate chunks) and not required
for anything this app currently does, turning it off was the lower-risk
fix over reverse-engineering the splitter's dead-code-elimination bug.
Worth revisiting if the app later depends on that optimization, or on an
RR upgrade past 7.13.0.

## Next up

Not yet started — pending your direction on which piece to tackle next:
propagating approved reviews to `resources` (and deciding what that even
means given the current schema — direct update? new `resource_history`
table?), or a different item from `resource-review-flow-scoping.md` §9.
