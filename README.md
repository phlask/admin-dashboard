# PHLASK Admin Dashboard

This is the admin dashboard for the [PHLASK](https://github.com/phlask/phlask-map/tree/develop) project. It provides a web interface for reviewing, editing, and managing community resource data using Supabase as the backend.

## Key Features

- View and manage resources from the Supabase database
- Review and approve/reject suggested edits to resources
- View and resolve reports on resources
- View resource changelogs and roll back changes if needed

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

To run the app locally, you must create a `.env` file in the root directory with the variables defined in the `.env.example` file. You should duplicate this file and populate the missing fields with the API secrets.

```bash
cp .example.env .env
```

If any variables are reported as missing, message us in the `#phlask-data` channel on Slack (See [Code For Philly](https://codeforphilly.org/) for more details). Also, refer to the `.env.example` file for more details.

### Development

Start the development server:

```bash
pnpm run dev
```

Visit [http://localhost:5174](http://localhost:5174) or as output in the terminal from pnpm run dev to view the app.

### Docker

To build and run with Docker: Have [Docker](https://docs.docker.com/get-docker/) installed and running.

In the root directory of the project, run:

```bash
docker build -t phlask-admin-dashboard .
docker run -p 3000:3000 phlask-admin-dashboard
```

Replace 3000:3000 with the actual port your application listens on if it is different.

## Project Structure

```text
app/
├── api/
│   ├── resources/
│   │   └── methods.ts      # API methods related to resources
│   ├── client.ts           # API client setup
│   └── types.ts            # Shared API request/response types
├── assets/
│   └── PHILASK_v2.svg      # Static assets (logos, images, etc.)
├── constants/
│   └── db.ts               # Database-related constants/config
├── routes/
│   ├── _layout.tsx         # Shared layout for route pages
│   ├── dashboard.tsx       # Dashboard page component
├── types/
│   └── ResourceEntry.ts    # Domain-specific TypeScript types
├── utils/
│   └── distance.ts         # Distance calculation utilities
├── app.css                 # Global application styles
├── root.tsx                # App root component / Entry point
└── routes.ts               # Route definitions and router configuration
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
