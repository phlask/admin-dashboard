import {
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { type LoaderFunction, useLoaderData, useNavigate } from "react-router";
import { getDatabaseClient } from "~/api/client.server";
import { getResourceRevisionAPI } from "~/api/resource-revisions/methods";
import { authMiddleware } from "~/middleware/auth";
import type { ResourceEdit } from "~/types/ResourceRevision";
import {
  resourceTypeChipColor,
  resourceTypeChipIcon,
} from "~/utils/chipColors";

export const middleware = [authMiddleware];

export const loader: LoaderFunction = async ({ request }) => {
  const { client } = getDatabaseClient(request);
  const revisionAPI = getResourceRevisionAPI(client);
  const revisions = await revisionAPI.getList({ status: "PENDING" });

  const resourceIds = [...new Set(revisions.map((r) => r.mapped_resource))];
  const resourceNames = new Map<number, string | null>();

  if (resourceIds.length > 0) {
    const { data, error } = await client
      .from("resources")
      .select("id, name, address")
      .in("id", resourceIds);

    if (error) {
      throw error;
    }

    for (const resource of data ?? []) {
      resourceNames.set(resource.id, resource.name || resource.address || null);
    }
  }

  return {
    revisions,
    resourceNames: Object.fromEntries(resourceNames),
  };
};

type RowData = ResourceEdit & { resourceLabel: string };

const columns: ColumnDef<RowData>[] = [
  {
    accessorKey: "name",
    header: "Proposed name",
    cell: ({ row }) => row.original.name || "—",
  },
  {
    accessorKey: "resource_type",
    header: "Type",
    cell: ({ row }) => (
      <Chip
        label={row.original.resource_type}
        size="small"
        icon={resourceTypeChipIcon(row.original.resource_type)}
        color={resourceTypeChipColor(row.original.resource_type)}
      />
    ),
  },
  {
    accessorKey: "resourceLabel",
    header: "Existing resource",
  },
  {
    accessorKey: "date_created",
    header: "Submitted",
    cell: ({ row }) =>
      new Date(row.original.date_created).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
  },
];

const ReviewsQueue = () => {
  const { revisions, resourceNames } = useLoaderData<{
    revisions: ResourceEdit[];
    resourceNames: Record<number, string | null>;
  }>();
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date_created", desc: true },
  ]);

  const data: RowData[] = useMemo(
    () =>
      revisions.map((revision) => ({
        ...revision,
        resourceLabel:
          resourceNames[revision.mapped_resource] ||
          `Resource #${revision.mapped_resource}`,
      })),
    [revisions, resourceNames],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  return (
    <div>
      <Typography variant="h5" fontWeight={600} gutterBottom>
        Resource edit reviews
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Proposed edits to existing PHLask resources, pending approval.
      </Typography>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableCell
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    sx={{ cursor: "pointer", fontWeight: 600 }}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {{ asc: " ↑", desc: " ↓" }[
                      header.column.getIsSorted() as string
                    ] ?? null}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <Typography color="text.secondary" sx={{ py: 3 }}>
                    No pending reviews. Nothing to do here right now.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={() => navigate(`/reviews/${row.original.id}`)}
                hover
                sx={{ cursor: "pointer" }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default ReviewsQueue;
