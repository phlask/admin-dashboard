import React from "react";

// TODO: Define ResourceReport type/schema based on your DB
// TODO: Implement fetchResourceReports() using Supabase

// AKTODO: NO need to use React.FC and also use react router specific fetch instead of useEffect and fetch API
const ResourceReports: React.FC = () => {
  // TODO: Replace with actual data fetching
  const reports = [
    {
      id: "report-1",
      resourceId: "resource-123",
      type: "Incorrect Info", // TODO: Use actual report types
      description: "The address is wrong.",
      reporter: "user@example.com",
      reportedAt: "2025-11-17",
      status: "OPEN", // OPEN, RESOLVED, DISMISSED
    },
  ];

  return (
    <div>
      <h2>Resource Reports</h2>
      <table>
        <thead>
          <tr>
            <th>Resource ID</th>
            <th>Type</th>
            <th>Description</th>
            <th>Reporter</th>
            <th>Reported At</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id}>
              <td>{report.resourceId}</td>
              <td>{report.type}</td>
              <td>{report.description}</td>
              <td>{report.reporter}</td>
              <td>{report.reportedAt}</td>
              <td>{report.status}</td>
              <td>
                {/* TODO: Wire up resolve/dismiss actions */}
                <button>Resolve</button>
                <button>Dismiss</button>
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

export default ResourceReports;
