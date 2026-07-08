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

## Next up

Not yet started — pending your direction on which piece from
`resource-review-flow-scoping.md` §9 (phasing) to tackle next.
