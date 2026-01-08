import React from "react";

// TODO: Define ResourceChangeLog type/schema based on your DB
// TODO: Implement fetchResourceChangelog() using Supabase

const ResourceChangelog: React.FC = () => {
  // TODO: Replace with actual data fetching
  const changelog = [
    {
      id: "change-1",
      resourceId: "resource-123",
      changedBy: "admin@phlask.org",
      changedAt: "2025-11-17",
      field: "status",
      oldValue: "OPERATIONAL",
      newValue: "TEMPORARILY_CLOSED",
      reason: "Maintenance",
    },
  ];

  return (
    <div>
      <h2>Resource Changelog</h2>
      <table>
        <thead>
          <tr>
            <th>Resource ID</th>
            <th>Changed By</th>
            <th>Changed At</th>
            <th>Field</th>
            <th>Old Value</th>
            <th>New Value</th>
            <th>Reason</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {changelog.map((change) => (
            <tr key={change.id}>
              <td>{change.resourceId}</td>
              <td>{change.changedBy}</td>
              <td>{change.changedAt}</td>
              <td>{change.field}</td>
              <td>{change.oldValue}</td>
              <td>{change.newValue}</td>
              <td>{change.reason}</td>
              <td>
                {/* TODO: Wire up rollback action using updateResource() from supabase.ts */}
                <button>Rollback</button>
                {/* TODO: View resource details */}
                <button>View Resource</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* TODO: Pagination, filtering */}
    </div>
  );
};

export default ResourceChangelog;
