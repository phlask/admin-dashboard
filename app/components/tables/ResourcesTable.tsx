import type { ResourceEntry } from "~/types/ResourceEntry";
import type { ColumnDefinition } from "./columns";

interface ResourceTableProps {
  data: ResourceEntry[];
  columns: ColumnDefinition[];
  isLoading: boolean;
  onViewClick: (id: string) => void;
}

export function ResourceTable({
  data,
  columns,
  isLoading,
  onViewClick,
}: ResourceTableProps) {
  if (isLoading) {
    return <div className="p-10 text-center">Loading resources...</div>;
  }

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm text-left text-gray-600">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
          <tr>
            <th className="px-6 py-3">Actions</th>
            {columns.map((col) => (
              <th
                key={String(col.accessorKey)}
                className="px-6 py-3"
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="p-8 text-center text-gray-400"
              >
                No resources found.
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={row.id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-6 py-4">
                  <button
                    onClick={() => onViewClick(row.id.toString())}
                    className="text-blue-600 hover:underline font-medium"
                    title="Check and edit resource"
                  >
                    View/Edit
                  </button>
                </td>
                {columns.map((col) => (
                  <td key={String(col.accessorKey)} className="px-8 py-4">
                    {col.render
                      ? col.render(row)
                      : (row as any)[col.accessorKey]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
