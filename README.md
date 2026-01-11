# PHLASK Admin Dashboard

## Overview

This is the admin dashboard for the PHLASK project. It provides a web interface for reviewing, editing, and managing community resource data using Supabase as the backend.

### Key Features

- View and manage resources from the Supabase database
- Review and approve/reject suggested edits to resources
- View and resolve reports on resources
- View resource changelogs and roll back changes if needed

## Getting Started

### Installation

Install dependencies:

```bash
pnpm install
```

### Development

Start the development server:

```bash
pnpm run dev
```

Visit [http://localhost:5174](http://localhost:5174) to view the app.

## Production Build

Build for production:

```bash
pnpm run build
```

## Deployment

### Docker

To build and run with Docker:

```bash
docker build -t phlask-admin-dashboard .
docker run -p 3000:3000 phlask-admin-dashboard
```

### Manual/Cloud

Deploy the output of `pnpm run build` to your preferred Node.js hosting or container platform.

## Project Structure

- `app/` — Main application code
  - `admin/` — Admin dashboard views (SuggestedEdits, ResourceReports, ResourceChangelog)
  - `utils/` — Supabase utility functions
  - `types/` — TypeScript types (including ResourceEntry)
- `public/` — Static assets
- `Dockerfile` — For container builds

## How to Contribute / Next Steps

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

## Where to Build Next

- Start by improving the admin views in `app/admin/`
- Check `app/utils/db.ts` for database helpers
- Update or add new TypeScript types in `app/types/`
- For new features, create a new branch and open a pull request

---

Built with ❤️ by the PHLASK team.
