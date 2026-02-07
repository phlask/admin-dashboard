# PHLASK Admin Dashboard

This is the admin dashboard for the [PHLASK](https://github.com/phlask/phlask-map/tree/develop) project. It provides a web interface for reviewing, editing, and managing community resource data using Supabase as the backend.

### Key Features

- View and manage resources from the Supabase database
- Review and approve/reject suggested edits to resources
- View and resolve reports on resources
- View resource changelogs and roll back changes if needed

## Getting Started

### Prerequisites

- Ensure you have [nodejs](https://nodejs.org/en/download) installed on your machine.
- Ensure you have [pnpm](https://pnpm.io/installation) installed globally for package management.
- Have Biome [https://biomejs.dev/guides/editors/first-party-extensions/] added to your code editor for consistent code formatting.

### Installation

Once you are in the root directory of the project.
Install dependencies with [pnpm](https://pnpm.io/installation):

```bash
pnpm install
```

### Development

Start the development server:

```bash
pnpm run dev
```

Visit [http://localhost:5174](http://localhost:5174) or as output in the terminal from pnpm run dev to view the app.

### Environment Variables

To see the data & tables create a `.env` file in the root directory with the following variables:
For reference, check and copy from the `.env.example` file.

```bash
cp .example.env .env
```

Your `.env` file should look like this:

```env
VITE_DB_NAME="resources"
VITE_DB_URL="Check .example.env for the URL"
VITE_DB_API_KEY="Message us in the #phlask-data channel on Slack"
```

Need access to the database? Message us in the [#phlask-data](https://codeforphilly.org/chat) channel on Slack. Also, refer to the `.env.example` file for more details.

### Docker

To build and run with Docker: Have [Docker](https://docs.docker.com/get-docker/) installed and running.

In the root directory of the project, run:

```bash
docker build -t phlask-admin-dashboard .
docker run -p 3000:3000 phlask-admin-dashboard
```

Replace 3000:3000 with the actual port your application listens on if it is different.

### Contributing and Pull Requests

Please refer to contributing guidelines [here](https://github.com/phlask/phlask-map?tab=readme-ov-file#want-to-add-something-new-or-developreport-a-fix-for-a-bug-you-found).

Before submitting a PR, please ensure that your code adheres to the project's coding standards and passes all tests. We recommend running the following command to check for linting errors and run tests:

```bash
pnpm biome check --write ./
```

| Command                        | Description        |
| ------------------------------ | ------------------ |
| `pnpm biome check --write ./`  | Check & Fix (Safe) |
| `pnpm biome format --write ./` | Format Only        |
| `pnpm biome lint --write ./`   | Lint Only          |

## Production Build

Build for production:

```bash
pnpm run build
```

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

Please check our [https://github.com/phlask/admin-dashboard/issues](https://github.com/phlask/admin-dashboard/issues) for open issues and feature requests.

Building with ❤️ by the PHLASK team.
