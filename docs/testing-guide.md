# Testing the `akk_agentdev/*` branches locally

How to check out each branch, run it against a local fake Supabase (no
credentials needed), and see every change in the UI — what changed, why, and
exactly what you should see.

- [1. One-time setup](#1-one-time-setup)
- [2. Start the fake Supabase](#2-start-the-fake-supabase)
- [3. Run a branch](#3-run-a-branch)
- [4. Branch-by-branch: what changed and how to see it](#4-branch-by-branch-what-changed-and-how-to-see-it)
- [5. Database-only changes (needs a staging Supabase)](#5-database-only-changes-needs-a-staging-supabase)
- [6. Automated tests](#6-automated-tests)
- [7. Troubleshooting](#7-troubleshooting)

---

## 1. One-time setup

Requirements: Node 22, pnpm 10 (`corepack enable`), git.

```bash
git clone https://github.com/phlask/admin-dashboard.git
cd admin-dashboard

# Download every akk_agentdev branch
git fetch origin '+refs/heads/akk_agentdev/*:refs/remotes/origin/akk_agentdev/*'
git branch -r | grep akk_agentdev
```

## 2. Start the fake Supabase

The integration branch ships `e2e/mock-supabase.mjs`, an in-memory stand-in
for Supabase login, the database queries the app makes, and the
approve / reject / rollback functions. Copy it **outside the repo** so it
keeps running while you switch branches.

**Terminal 1** (leave it running):

```bash
mkdir -p ~/phlask-mock
git show origin/akk_agentdev/integration:e2e/mock-supabase.mjs > ~/phlask-mock/mock-supabase.mjs
node ~/phlask-mock/mock-supabase.mjs        # → "mock supabase listening on 54400"
```

Useful while testing (from any terminal):

```bash
curl -X POST http://127.0.0.1:54400/__reset      # restore the starting data
curl -s http://127.0.0.1:54400/__log             # every request the app sent
```

**Log in with:** any email, password `correct-horse`. Whatever email you type,
the fake server signs you in as **`reviewer@phlask.org`**, so that's the name
you'll see in banners, the audit log and the Account page.

**Starting data**

| Record | What it is |
|---|---|
| Resource **#1** "Grace Cafe Philly" | 55 North Broad Street, WATER, OPERATIONAL |
| Resource **#2** "Love Park Fountain" | A second resource, further away |
| Edit **#7** (pending) | Submitted by alice@example.com. Changes **only the name** → "Grace Cafe (Broad St)". Every other column is NULL (= "no change") |
| Edit **#8** (pending) | A **new site** "Grace Cafe Phila", 55 N. Broad St, about 4 m from resource #1 (a likely duplicate) |
| Edits **#3**, **#4** (approved) | History for resource #1. #3 produced the version named "Grace Cafe" with guidelines "Bring a bottle."; #4 produced the current version |
| Edit **#5** (rejected) | Reason "Spam" |

## 3. Run a branch

**Terminal 2**, from the repo:

```bash
# Paste once per terminal session:
try_branch() {
  git switch "akk_agentdev/$1" &&
  git pull --ff-only -q &&
  pnpm install --frozen-lockfile &&
  curl -s -X POST http://127.0.0.1:54400/__reset &&
  SUPABASE_URL=http://127.0.0.1:54400 SUPABASE_PUBLISHABLE_KEY=local-mock pnpm dev
}

try_branch pr45-supabase-views     # then open http://localhost:5174 and log in
```

Stop it with `Ctrl+C`, then `try_branch <next-branch>`.

- The variables on the command line win over any `.env` you have, so your
  real credentials are never used.
- To compare with what's live today, run `main` the same way:
  `git switch main && pnpm install && SUPABASE_URL=http://127.0.0.1:54400 SUPABASE_PUBLISHABLE_KEY=local-mock pnpm dev`.
- The first page load after switching branches re-bundles and reloads once.
  See [Troubleshooting](#7-troubleshooting) if a page looks broken.

### Branch map

Branches marked *stacked* build on the one above, so each contains all
earlier changes. Test them top to bottom.

| # | Branch | Issue / PR | Based on |
|---|---|---|---|
| A | `fix-review-views-rls` | security fix | `main` |
| B | `root-cleanup` | #53 | `main` |
| C | `agents-md` | #54 | `main` |
| 1 | `pr45-supabase-views` | PR #45, #43 | `main` |
| 2 | `pr46-maps-preview` | PR #46, #36 | stacked on 1 |
| 3 | `review-changed-fields` | #52 | stacked on 2 |
| 4 | `fix-approve-null-wipe` | #50 | stacked on 3 |
| 5 | `review-actions` | #12, #51 (warning only) | stacked on 4 |
| 6 | `resource-history` | #6, #7 | stacked on 5 |
| 7 | `duplicate-detection` | #35 | stacked on 6 |
| 8 | `audit-logs` | #48 | stacked on 7 |
| 9 | `account-page` | #47, #13 | stacked on 8 |
| 10 | `e2e-tests` | #4, #9 | stacked on 9 |
| — | `integration` | everything merged | 10 + A + B + C |

---

## 4. Branch-by-branch: what changed and how to see it

Run `curl -X POST http://127.0.0.1:54400/__reset` before each scenario
(`try_branch` does it for you when you switch).

### A. `fix-review-views-rls` — pending edits leaked to logged-out users

**Why:** the review-queue views (`resource_edits_queue`,
`new_resources_queue`, …) ran with the view owner's rights, which skips the
table's access rules (RLS). Anyone with the public key could read every
pending edit, including submitter emails, while the table itself correctly
returned nothing.

**What changed:** one migration switches the views to `security_invoker`
(they now obey RLS) and revokes access for logged-out users.

**How to see it:** there's nothing visible in the UI, and the fake Supabase
doesn't enforce RLS. Verify it against a staging Supabase:
[§5.1](#51-security-fix-a).

### B. `root-cleanup` — #53

**Why:** deploy files were scattered in the root, a stray screenshot was
checked in, Docker wasn't used, and the README described files that don't
exist.

**What changed**
- `server.js`, `deploy-manifest.json`, `bin/postbuild.sh` moved to
  `deploy/amplify/`; `amplify.yml` points there.
- Screenshot, `Dockerfile` and `.dockerignore` removed.
- `.claude/settings.local.json` is git-ignored.
- README: `.example.env` name fixed, project tree rewritten, deploy and
  migration sections added.

**How to see it:**

```bash
git switch akk_agentdev/root-cleanup
ls deploy/amplify                     # deploy-manifest.json  postbuild.sh  server.js
ls Dockerfile bin 2>&1                # both gone

# Build exactly like Amplify does, then boot the bundle:
pnpm install --frozen-lockfile && pnpm build && bash deploy/amplify/postbuild.sh
cd .amplify-hosting/compute/default
SUPABASE_URL=http://127.0.0.1:54400 SUPABASE_PUBLISHABLE_KEY=local-mock PORT=3000 node index.js
```

Open http://localhost:3000. You land on the login page, and logging in works.
That proves the moved deploy files still produce a working bundle.

### C. `agents-md` — #54

**What changed:** new `AGENTS.md` (stack, commands, code map, house rules for
AI agents) and `CLAUDE.md` (imports AGENTS.md plus Claude-specific notes).
Just read the two files.

### 1. `pr45-supabase-views` — PR #45 (+ #43)

**Why:** PR #45 had fallen behind `main`. Its dashboard also tallied stats in
JavaScript from capped lists (Supabase silently stops a list at 1,000 rows),
so the numbers would undercount as data grows.

**What changed:** #45 merged up to date with `main`; dashboard stats now come
from new database views.

**What you'll see** (compare with `main`):
1. **Reviews**: two tables, **"New site submissions"** (Grace Cafe Phila)
   and **"Edits to existing resources"** (Grace Cafe (Broad St)) with a
   **Pending edits** column. On `main` it's one mixed table with a "Kind"
   column.
2. **Dashboard**: "Top submitters" lists alice / carol / erin / spam with 1
   each, and "Top approvers" shows vol@phlask.org with 2.
3. Open edit **#7**: a **Change history** panel lists 2 approved and 1
   rejected ("Spam") past decisions.
4. On this branch #7's Proposed column shows most fields **blank**. That's
   because the edit is name-only and the old code treats NULL as "erase";
   it's the #50 bug, fixed in branch 4. "Submitted …" also shows no
   submitter yet (fixed in branch 3).

### 2. `pr46-maps-preview` — PR #46 (+ #36)

**Why:** reviewers couldn't see where a submission is. After the merge I
also fixed two problems: the map reloaded on every keystroke (each reload is
a paid Google call), and a moved resource showed only the new spot.

**What you'll see**
1. Open **#8**. Without a key you get the notice *"Map preview is
   unavailable — no Google Maps API key is configured"*.
2. With a key (from the phlask-map project), restart with it:
   `VITE_GOOGLE_MAPS_API_KEY=<key> SUPABASE_URL=http://127.0.0.1:54400 SUPABASE_PUBLISHABLE_KEY=local-mock pnpm dev`.
   You see a map with a red pin and a Street View panel.
3. **Moved-resource warning** (key required): open **#7**, type Latitude
   `39.9560` and Longitude `-75.1628833` (both are blank on this branch).
   About 0.6 s after you stop typing, a grey "current location" pin appears
   with *"This edit moves the resource 213 m from its current location"*.
   While you're still typing, the map doesn't move (that's the debounce).

### 3. `review-changed-fields` — #52

**Why:** an edit is a full copy of the resource, so reviewers saw ~15
identical Current/Proposed pairs and had to spot the one real change by eye.

**What changed**
- Changed rows get a tint, a left border and a **Changed** chip.
- A header shows "N of 15 fields changed", plus a **Show changed fields only**
  switch (on by default).
- Long values wrap instead of being cut off, and Current/Proposed are equal
  width.
- New **Status** row (a "permanently closed" report used to be invisible).
- "Submitted … by" now shows the submitter, not the resource's creator.
- **Approve is disabled while you have unsaved edits**, because approving
  used to silently discard them.

**What you'll see**
1. Open **#7**: "Submitted … **by alice@example.com**".
2. The header reads **"12 of 15 fields changed"**. That number is inflated by
   the #50 bug (blank = erase on this branch); compare with branch 4, where it
   reads "1 of 15".
3. Toggle **Show changed fields only** off and on: unchanged rows hide and
   reappear.
4. Type in any Proposed field. The **Changed** marking updates live, a yellow
   *"You have unsaved changes"* warning appears, and **Approve becomes
   disabled**.

### 4. `fix-approve-null-wipe` — #50

**Why:** approving an edit overwrote **every** column with the edit's values,
so a name-only edit erased the address, description and coordinates, and the
resource vanished from the map.

**What changed**
- **Database:** a NULL column on an edit now means "no change". Clearing a
  field on purpose is explicit through a new `cleared_fields` list.
- **Review page:** unchanged fields show the current value as the proposal
  (that's what approving will actually leave).
- **Save:** sends only the fields you changed, and records fields you
  emptied in `cleared_fields`. Save is disabled when nothing changed.
- The queue and dashboard count name-only edits under the resource's type.

**What you'll see**
1. Open **#7**: **"1 of 15 fields changed"**, only Name. (It was "12 of 15" on
   branch 3.)
2. Toggle **Show changed fields only** off: Proposed now shows the current
   address and description instead of blanks.
3. **Save sends only your changes:** change **City** to `Phila`, clear
   **Guidelines**, click **Save changes**. You get "Changes saved." and the
   header becomes "3 of 15". Then run:
   ```bash
   curl -s http://127.0.0.1:54400/__log | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>JSON.parse(s).filter(r=>r.method==="PATCH").forEach(r=>console.log(JSON.stringify(r.body))))'
   ```
   It prints `{"city":"Phila","guidelines":null,"cleared_fields":["guidelines"]}`.
4. **Approve** (after saving). Then check the resource kept its other fields:
   ```bash
   curl -s 'http://127.0.0.1:54400/rest/v1/resources?id=eq.1' | grep -o '"address":"[^"]*"'
   ```
5. Dashboard → **Outstanding by resource type** shows WATER **2** (before
   this fix the name-only edit wasn't counted).
6. The real database part (approve no longer wipes fields) is verified in
   [§5.2](#52-approve-no-longer-wipes-fields-4).

### 5. `review-actions` — #12, #51 (warning only)

**Why:** rejecting didn't capture a reason (the database already supported
one). Reviewers also had no idea when other pending edits targeted the same
resource (the "approve one, silently undo another" problem in #51).

**What changed:** a reject dialog with an optional reason; decided edits show
who, when and why; and a warning listing competing pending edits. What
approving should *do* to competing edits is still a team decision on #51, so
that part isn't changed.

**What you'll see**
1. Open **#7** → **Reject** → a dialog opens. Type a reason → **Reject edit**.
   You're sent back to the queue.
2. Open http://localhost:5174/reviews/7 again: a red banner reads *"Rejected
   by reviewer@phlask.org on … Reason: …"*.
3. **Competing edits:** reset, then point #8 at resource #1:
   ```bash
   curl -X POST http://127.0.0.1:54400/__reset
   curl -X PATCH 'http://127.0.0.1:54400/rest/v1/resource_edits?id=eq.8' \
        -H 'content-type: application/json' -d '{"mapped_resource":1}'
   ```
   Open **#7**: *"Another pending edit targets this resource…"* with a link
   to **#8**.

### 6. `resource-history` — #6, #7

**Why:** there was no way to browse resources or see and undo past approvals.
The old rollback function re-applied an old edit, which (with partial edits
from #50) would restore only some fields.

**What changed**
- **Database:** each approval now saves the full resource as it stood
  afterwards (`applied_snapshot`), and rollback restores that exact version.
- **UI:** a new **Resources** page (search, filters, pages) and a per-resource
  history page with **Roll back to this**.

**What you'll see**
1. Sidebar → **Resources**: 2 rows. Search `Love` → only Love Park Fountain.
   Try the Type and Status filters.
2. Click **Grace Cafe Philly** (`/resources/1`). Version history shows #4
   **Current version**, #5 *Reason: Spam*, and #3.
3. Click **Roll back to this** on **#3**. The dialog lists the fields that will
   change: **Guidelines**, **Name**. Click **Roll back**.
4. You see *"Rolled back to the version from edit #3."*, the heading is now
   **Grace Cafe**, and "Current version" moves to #3.
5. Cancel instead → nothing changes.
6. On any review page with history, **Full history & rollback →** links here.

### 7. `duplicate-detection` — #35

**Why:** a new submission for a place already on the map would create a
second pin.

**What changed:** each new submission is scored against resources within
150 m on distance, name, address, type, or an identical Google Place ID.
Reviewers can turn a duplicate into an edit of the existing resource.

**What you'll see**
1. **Reviews** → "New site submissions" has a **Possible duplicate** column:
   **#1 · 87%**.
2. Open **#8**: the title is *"Review new site submission"*, with a **Possible
   duplicates** panel: **High · 87% Grace Cafe Philly — 4 m away · Similar
   name · Same type**.
3. Click **Treat as edit of #1** → confirm. The page reloads as an edit of #1
   with the "N of 15 fields changed" comparison, and the duplicates panel is
   gone.

### 8. `audit-logs` — #48

**Why:** there was no record of who approved, rejected, rolled back or
changed what.

**What changed**
- **Database:** an `audit_log` table filled by database triggers on edits,
  resources and providers, so every change is captured, even ones made from
  the map or the SQL editor. Entries can't be edited or deleted, even with the
  service-role key.
- **UI:** a new **Audit log** page.

**What you'll see**
1. Sidebar → **Audit log**: *"No activity matches these filters."*
2. Approve **#7**, reject **#8** (with a reason), and roll back to **#3** on
   `/resources/1`.
3. Back on **Audit log**: rows for APPROVE, UPDATE (resource), REJECT and
   ROLLBACK, newest first.
4. Click the arrow on a row to see the before/after values of each changed
   field.
5. Filter Action = `ROLLBACK` → 1 row. Try the User, Record type, date and
   Sort filters; **Reset** clears them.
6. The append-only guarantee is a database property: [§5.4](#54-audit-log-8).

### 9. `account-page` — #47, #13

**Why:** login and forgot/reset password existed, but a logged-in user
couldn't change their password or name without an admin.

**What changed:** a new **Account** page. Changing the password **requires
the current password**, so a browser left logged in can't be used to take
over the account.

**What you'll see** (the fake server's "current password" is `correct-horse`)
1. Sidebar → **Account**: reviewer@phlask.org, member-since and last sign-in.
2. Set **Display name** → **Save profile** → "Profile updated." It survives a
   page reload.
3. Change password:
   - wrong current password → *"Current password is incorrect"*
   - new password and confirmation differ → *"Passwords do not match"*
   - fewer than 8 characters → validation error
   - `correct-horse` + a matching 8+ character password → *"Password
     changed."* and the form clears.

Not included on purpose: open sign-up / "request an account". Every logged-in
user can approve edits today, so that needs a roles decision first.

### 10. `e2e-tests` — #4, #9

Adds Vitest unit tests and Playwright browser tests. The issues asked for
Cypress, but it couldn't be installed in the environment this was built in;
Playwright covers the same flows and runs in CI. See [§6](#6-automated-tests).

### `integration` — everything together

`try_branch integration` and repeat any of the scenarios above. Every page is
in the sidebar: Dashboard, Reviews, Resources, Providers, Audit log, Account.

---

## 5. Database-only changes (needs a staging Supabase)

The fake Supabase doesn't run SQL, so the database guarantees (access rules,
partial apply, snapshots, append-only audit log) need a real Postgres.

> ⚠️ **Use a staging / test Supabase project, never production.** The live
> map reads the same database. Every SQL block below runs inside
> `begin; … rollback;`, so it changes nothing permanently.

Run the SQL with **`psql`**, using the staging connection string (Supabase
dashboard → **Connect**): `psql "postgresql://…"`, then paste a block. The
dashboard SQL editor shows only the last result of a script, and here that
would be the `rollback`.

Apply the new migrations in filename order (paste each file into the SQL
editor, or run `psql "<url>" -f <file>`) from the `integration` branch:

```
supabase/migrations/20261014000000_resource_edit_views_security_invoker.sql
supabase/migrations/20261014010000_resource_edit_stats_views.sql
supabase/migrations/20261014020000_resource_edits_partial_apply.sql
supabase/migrations/20261014030000_resource_edits_version_snapshots.sql
supabase/migrations/20261014040000_audit_log.sql
```

Each one has an undo script in `supabase/rollback/` (run those newest first).
To see a "before", run the checks below once before applying the migrations
and once after.

### 5.1 Security fix (A)

With the staging URL and **publishable** key (logged out = the `anon` role):

```bash
curl -s "$SUPABASE_URL/rest/v1/resource_edits_queue?select=id,submitted_by&limit=3" \
     -H "apikey: $SUPABASE_PUBLISHABLE_KEY"
```

- **Before:** JSON rows of pending edits (`[]` if the queue is empty, so add
  a test submission first to see the leak).
- **After:** `{"code":"42501", … "permission denied for view resource_edits_queue"}`.
  Logged in, the dashboard still loads the review queue normally.

### 5.2 Approve no longer wipes fields (4)

Uses the first existing resource; the final `rollback` undoes everything.

```sql
begin;
create temp table t on commit drop as
  select id, name, address, description, latitude from public.resources order by id limit 1;

insert into public.resource_edits (mapped_resource, submitted_by, name)
select id, 'guide', 'ZZ renamed' from t;

select (public.approve_edit(
  (select max(id) from public.resource_edits where submitted_by = 'guide'), 'guide')).name;

select t.name as name_before, r.name as name_after,
       t.address as address_before, r.address as address_after,
       t.latitude as lat_before, r.latitude as lat_after
from t join public.resources r using (id);
rollback;
```

- **Before** migration `…020000`: `address_after` and `lat_after` are
  **empty** (or the approve fails on a NOT NULL column).
- **After:** only the name changes; address and latitude match "before".

### 5.3 Exact-version rollback (6)

```sql
begin;
create temp table t on commit drop as
  select id, guidelines, address from public.resources where address is not null order by id limit 1;

-- v1: rename
insert into public.resource_edits (mapped_resource, submitted_by, name)
select id, 'guide-1', 'ZZ v1' from t;
select (public.approve_edit((select max(id) from public.resource_edits where submitted_by = 'guide-1'), 'guide')).name;

-- v2: change guidelines and deliberately clear the address
insert into public.resource_edits (mapped_resource, submitted_by, guidelines, cleared_fields)
select id, 'guide-2', 'ZZ cups provided', '{address}' from t;
select (public.approve_edit((select max(id) from public.resource_edits where submitted_by = 'guide-2'), 'guide')).name;
select name, guidelines, address from public.resources where id = (select id from t);
--   → ZZ v1 | ZZ cups provided | (empty)

-- roll back to v1
select (public.rollback_to_edit((select max(id) from public.resource_edits where submitted_by = 'guide-1'), 'guide')).name;
select r.name, r.guidelines, r.address, r.address = t.address as address_restored
from public.resources r join t using (id);
--   → ZZ v1 | <original guidelines> | <original address> | t
rollback;
```

### 5.4 Audit log (8)

```sql
begin;
insert into public.providers (name) values ('ZZ audit test');
select action, table_name, record_id, actor from public.audit_log order by id desc limit 1;
--   → INSERT | providers | <id> | system:postgres   (via the dashboard: the reviewer's email)

delete from public.audit_log;   -- ERROR: audit_log is append-only (DELETE is not allowed)
rollback;
```

Rows written from the dashboard show the reviewer's email as `actor`; rows
from anonymous map submissions show `anon`.

---

## 6. Automated tests

On `e2e-tests` or `integration`:

```bash
pnpm install --frozen-lockfile
pnpm typecheck && pnpm exec biome ci .
pnpm test                                  # 14 unit tests
pnpm exec playwright install chromium      # first time only
pnpm test:e2e                              # 14 browser tests
pnpm exec playwright show-report           # HTML report after a run
```

`pnpm test:e2e` builds the app and starts its own fake Supabase on port
54400. **Stop the one from §2 first (Ctrl+C in Terminal 1).** Otherwise
Playwright reuses yours, resets its data, and an older copy can make tests
fail.

CI runs all of this on every pull request (the `tests` job in
`.github/workflows/pull_request.yml`).

---

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| Page reloads by itself, or shows *"Cannot read properties of null (reading 'useState')"* right after switching branches | The dev server is re-bundling dependencies (the terminal shows "optimized dependencies changed. reloading"). Wait for that, then refresh. If it persists: `rm -rf node_modules/.vite` and restart. |
| Login says invalid credentials | The fake server's password is `correct-horse`. Check Terminal 1 is running. |
| "Database credentials are missing" | You started `pnpm dev` without the `SUPABASE_URL=… SUPABASE_PUBLISHABLE_KEY=…` prefix. |
| Data looks changed from an earlier test | `curl -X POST http://127.0.0.1:54400/__reset` |
| `git switch` refuses | Commit or stash local changes first (`git stash`). |
| Port 5174 or 54400 in use | Another dev server or fake server is still running; stop it. |
