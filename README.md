# PHLASK Admin Dashboard

This is the admin dashboard for the [PHLASK](https://github.com/phlask/phlask-map/tree/develop) project. It provides a web interface for reviewing, editing, and managing community resource data using Supabase as the backend.

## Key Features

- Authenticate via Supabase (login, password reset, email confirmation) and manage your own profile and password
- Review crowdsourced edits and new-site submissions: see exactly which fields changed, tweak the proposal, approve or reject with a reason
- Spot likely duplicate submissions and review them as edits of the existing resource
- Browse resources, view each one's version history and roll back to an earlier version
- Manage resource providers
- Audit log of every change to submissions, resources and providers
- Light/dark theme support

## Getting Started

### Prerequisites

- Ensure you have [nodejs](https://nodejs.org/en/download) installed on your machine.
- Ensure you have [pnpm](https://pnpm.io/installation) installed globally for package management.
- Have [Biome](https://biomejs.dev/guides/editors/first-party-extensions/) added to your code editor for consistent code formatting.

### Installation

Once you are in the root directory of the project.
Install dependencies with [pnpm](https://pnpm.io/installation):

```bash
pnpm install
```

### Environment Variables

To run the app locally, you must create a `.env` file in the root directory with the variables defined in the `.example.env` file. You should duplicate this file and populate the missing fields with the API secrets.

```bash
cp .example.env .env
```

If any variables are reported as missing, message us in the `#phlask-data` channel on Slack (See [Code For Philly](https://codeforphilly.org/) for more details). Also, refer to the `.example.env` file for more details.

### Development

Start the development server:

```bash
pnpm run dev
```

Visit [http://localhost:5174](http://localhost:5174) or as output in the terminal from pnpm run dev to view the app.

### Testing

```bash
pnpm test        # unit tests (Vitest)
pnpm test:e2e    # end-to-end tests (Playwright)
```

The end-to-end tests build the app and run it against an in-memory mock of Supabase (`e2e/mock-supabase.mjs`), so they need no credentials. The first time, install the browser with `pnpm exec playwright install chromium`. Both suites run in CI on every pull request.

### Deployment

The app is deployed with [AWS Amplify Hosting](https://docs.aws.amazon.com/amplify/latest/userguide/welcome.html). `amplify.yml` runs `pnpm run build` and then `deploy/amplify/postbuild.sh`, which packages the build into `.amplify-hosting/` using the Express entry point (`deploy/amplify/server.js`) and the routing manifest (`deploy/amplify/deploy-manifest.json`).

To check a deploy bundle locally:

```bash
pnpm run build
bash deploy/amplify/postbuild.sh
cd .amplify-hosting/compute/default && node index.js   # serves on PORT (default 3000)
```

### Database migrations

SQL migrations for the Supabase database live in `supabase/migrations/` and are applied in filename order. Each has a matching script in `supabase/rollback/` that reverses it; rollbacks are kept out of `migrations/` so the Supabase CLI doesn't apply them.

## Project Structure

```text
app/
├── api/
│   ├── audit-log/methods.ts       # Audit log queries
│   ├── client.server.ts           # Supabase client setup (server-side)
│   ├── types.ts                   # Shared API request/response types
│   ├── providers/methods.ts       # Providers CRUD + per-provider resource counts
│   ├── resource-edits/methods.ts  # Review queues, approve/reject RPCs, change log
│   └── resources/methods.ts       # Live resources table
├── assets/                        # Static assets (logos, images, etc.)
├── components/                    # Shared UI (ThemeToggle, WaveDivider, ...)
├── constants/
│   └── db.server.ts               # Supabase URL / key from the environment
├── context/
│   └── user.ts                    # Authenticated user context
├── middleware/
│   └── auth.ts                    # Route authentication middleware
├── routes/
│   ├── authenticated/             # Routes that require a logged-in user
│   │   ├── _layout.tsx            # Sidebar shell
│   │   ├── dashboard.tsx          # Review stats overview
│   │   ├── account.tsx            # Profile + change password
│   │   ├── audit-logs.tsx         # Searchable audit log
│   │   ├── logout.tsx
│   │   ├── providers/             # Manage resource providers
│   │   ├── resources/             # Resource list + version history / rollback
│   │   └── reviews/               # Review queue + approve/reject/edit detail page
│   └── unauthenticated/           # Login, forgot/reset password, email confirm
├── schemas/                       # Zod schemas for auth forms
├── theme/                         # MUI theme + light/dark mode (cookie-backed)
├── types/                         # Domain types (ResourceEntry, ResourceEdit, Provider)
├── utils/                         # Diffing, duplicate scoring, distance, chip colours (+ unit tests)
├── app.css                        # Global application styles
├── root.tsx                       # App root component / Entry point
└── routes.ts                      # Route definitions
deploy/
└── amplify/                       # AWS Amplify Hosting server, manifest and postbuild script
docs/                              # Scoping notes, implementation log, screenshots
e2e/                               # Playwright specs + in-memory Supabase mock
supabase/
├── migrations/                    # Forward SQL migrations (applied in order)
└── rollback/                      # Matching down-migrations
```

## How to Contribute / Next Steps

- Please refer to the [contributing guidelines](https://github.com/phlask/phlask-map/blob/develop/contributing.md).

- Please check our [GitHub issues](https://github.com/phlask/admin-dashboard/issues) for open issues and feature requests.

- Before submitting a PR, please ensure that your code adheres to the project's coding standards and passes all tests. We recommend running the following command to check for linting errors and run tests:

```bash
pnpm biome check --write ./
```

| Command                        | Description        |
| ------------------------------ | ------------------ |
| `pnpm biome check --write ./`  | Check & Fix (Safe) |
| `pnpm biome format --write ./` | Format Only        |
| `pnpm biome lint --write ./`   | Lint Only          |

---
Building with ❤️ by the PHLASK team.
