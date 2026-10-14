# AGENTS.md

Instructions for AI coding agents (Claude Code, Codex, Copilot, Cursor, ...)
working in this repository. Human contributors are welcome to read it too —
it is the short version of "how we work here". Agents must follow these rules
unless the person they're working for explicitly says otherwise.

## What this is

The PHLASK admin dashboard: volunteers log in, review crowdsourced edits and
new-site submissions for the [PHLASK map](https://github.com/phlask/phlask-map),
approve or reject them, and manage resource providers. The backend is a shared
Supabase (Postgres) project that the public map also reads from, so **a bad
change here can take resources off the live map.**

## Stack

- React Router 7 in framework mode with SSR (`react-router.config.ts`), React 19
- MUI 7 + Emotion for UI, `@tanstack/react-table` for tables
- Supabase via `@supabase/ssr` (server-side client only), Zod for form schemas
- TypeScript (strict), Biome for lint + format, pnpm
- Deployed on AWS Amplify Hosting (`amplify.yml`)

## Commands

```bash
pnpm install --frozen-lockfile   # install (never update the lockfile by hand)
pnpm dev                         # dev server on http://localhost:5174
pnpm typecheck                   # react-router typegen + tsc
pnpm exec biome ci .             # exactly what CI runs on every PR
pnpm exec biome check --write .  # auto-fix formatting / safe lint fixes
pnpm build                       # production build
```

There is no unit-test suite yet. **Before you say a change is done, all of
`pnpm typecheck`, `pnpm exec biome ci .` and `pnpm build` must pass.** Say so
explicitly in your summary, and say what you could not verify (e.g. no
Supabase credentials, no browser).

## Code map

| Path | What lives there |
|---|---|
| `app/routes.ts` | Route table. New pages must be registered here. |
| `app/routes/authenticated/` | Pages behind login. Each exports `middleware = [authMiddleware]`. |
| `app/routes/unauthenticated/` | Login, forgot/reset password, email confirm. |
| `app/api/<entity>/methods.ts` | Data access: `get<Entity>API(client)` returning async methods that throw on Supabase errors. |
| `app/api/client.server.ts` | `getDatabaseClient(request)` → `{ client, headers }`. |
| `app/types/` | Domain types mirroring DB rows (`ResourceEntry`, `ResourceEdit`, `Provider`). |
| `app/middleware/auth.ts`, `app/context/user.ts` | Auth middleware and the signed-in user context. |
| `app/theme/` | MUI theme, light/dark mode (cookie-backed, SSR-safe). |
| `supabase/migrations/` | Forward SQL migrations, applied in filename order. |
| `supabase/rollback/` | One `*.down.sql` per migration. |
| `docs/` | Scoping notes and the implementation log. |

## Rules

### Data access and auth

- Talk to Supabase **only from loaders/actions** through `getDatabaseClient`.
  Never create a browser-side Supabase client and never import a
  `*.server.ts` module from component code.
- When an action changes the session (sign in/out, password change), return
  the `headers` from `getDatabaseClient` on the response, or the cookie update
  is lost.
- The app only ever uses the **publishable (anon) key**; everything relies on
  Row Level Security. Never add a service-role key, never ask for one, never
  commit secrets or `.env`.
- Mutations go in `action`s (POST), never in `loader`s.
- Review state changes go through the SQL RPCs (`approve_edit`,
  `reject_edit`, `rollback_to_edit`), never through direct table updates —
  the RPCs are what set `reviewed_by` / `reviewed_at` and apply the edit
  atomically.
- Keep queries server-side and aggregate in the database (a view), not in JS:
  PostgREST silently truncates responses at `max-rows` (1000 by default), so
  JS-side tallies under-report without any error.

### Database migrations

- New file per change: `supabase/migrations/YYYYMMDDHHMMSS_short_name.sql`,
  plus the matching `supabase/rollback/YYYYMMDDHHMMSS_short_name.down.sql`.
- **Never edit a migration that is already on `main`** — it may already be
  applied to the shared database. Write a new one.
- Wrap each migration in `begin; ... commit;` and start it with a header
  comment explaining the *why*.
- Views must be created `with (security_invoker = true)`, otherwise they run
  as the owner and bypass RLS (Supabase grants new views to `anon` by default).
  Revoke `anon` on anything reviewers-only.
- `SECURITY DEFINER` functions must `set search_path = public` and have
  `execute` revoked from `public, anon`.
- Test migrations against a real Postgres before pushing when you can
  (apply all migrations in order, exercise the change, run the rollback,
  re-apply). Say in the PR how you tested.

### UI and code style

- Biome is the source of truth for formatting: 2 spaces, double quotes,
  semicolons, trailing commas, 80 columns. Don't hand-format; run
  `biome check --write`.
- Use the `~/` alias for imports from `app/`.
- Use MUI components and the `sx` prop; use theme tokens (`brand`, `navy`,
  `theme.applyStyles("dark", ...)`) rather than hard-coded colours so dark
  mode keeps working.
- Match the comment style around you: comments explain *why*, not what.
- Don't add dependencies without a reason stated in the PR.
- Don't re-enable `future.v8_splitRouteModules` in `react-router.config.ts`;
  see `docs/implementation-progress.md` ("page freezes and crashes").

### Git and pull requests

- Never push to `main`. Work on a branch; keep one issue per PR when
  possible.
- Commit messages: imperative summary line under ~72 characters, then a body
  explaining what changed and why.
- Fill in `.github/pull_request_template.md` (Problem / Solution / Reference /
  Screenshots / Checklist). Link the issue with `Closes #N`. Include
  screenshots for any visual change.
- Never rewrite history on someone else's branch, never skip or disable
  checks to get CI green.

## Before you finish, check

1. `pnpm typecheck`, `pnpm exec biome ci .`, `pnpm build` all pass.
2. New pages are registered in `app/routes.ts` and protected by
   `authMiddleware` if they show non-public data.
3. Every new migration has a rollback, uses `security_invoker` for views, and
   doesn't modify an existing migration.
4. No secrets, `.env` files or service-role keys in the diff.
5. Your summary states what you verified and what you couldn't.
