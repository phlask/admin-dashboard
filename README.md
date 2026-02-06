# PHLASK Admin Dashboard

This is the admin dashboard for the [PHLASK](https://github.com/phlask/phlask-map/tree/develop) project. It provides a web interface for reviewing, editing, and managing community resource data using Supabase as the backend.

### Key Features

- View and manage resources from the Supabase database
- Review and approve/reject suggested edits to resources
- View and resolve reports on resources
- View resource changelogs and roll back changes if needed

## Getting Started

### Installation

Ensure you have [nodejs](https://nodejs.org/en/download) installed on your machine.

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
```env
VITE_DB_NAME="resources"
VITE_DB_URL="Message us in the #phlask-data channel on Slack"
VITE_DB_API_KEY="Message us in the #phlask-data channel on Slack"
```
<<<<<<< Updated upstream
Need access to the database? Message us in the [#phlask-data](https://codeforphilly.org/chat) channel on Slack. Also, refer to the `.env.example` file for more details.
=======
>>>>>>> Stashed changes

### Docker

To build and run with Docker: Have [Docker](https://docs.docker.com/get-docker/) installed and running.

In the root directory of the project, run:
```bash
docker build -t phlask-admin-dashboard .
docker run -p 3000:3000 phlask-admin-dashboard
```
Replace 3000:3000 with the actual port your application listens on if it is different.

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

Please check our [https://github.com/phlask/admin-dashboard/issues](https://github.com/phlask/admin-dashboard/issues) for open issues and feature requests. Here are some ideas for next steps:

1. **Resource Table Improvements**
   - Add filtering, sorting, and pagination to resource tables
   - Add search functionality

2. **Suggested Edits**
   - Implement fetching and reviewing of suggested edits (requires DB schema)
   - Add approve/reject actions

3. **Resource Reports**
   - Wire up report resolution and dismissal actions
   - Add filtering by status/type

4. **Changelog & Rollback**
   - Implement changelog fetching (requires DB schema)
   - Add rollback functionality for resource changes

5. **UI/UX**
   - Add navigation, breadcrumbs, and better error/loading states
   - Improve accessibility and mobile responsiveness

6. **Testing**
   - Add unit and integration tests for components and utilities

7. **Documentation**
   - Expand this README with API details and developer setup notes

---

Building with ❤️ by the PHLASK team.
