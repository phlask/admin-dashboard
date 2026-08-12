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
import { getResourceEditAPI } from "~/api/resource-edits/methods";
import { authMiddleware } from "~/middleware/auth";
import type { ResourceEdit, ResourceEditQueueRow } from "~/types/ResourceEdit";
import {
  resourceTypeChipColor,
  resourceTypeChipIcon,
} from "~/utils/chipColors";

export const middleware = [authMiddleware];

export const loader: LoaderFunction = async ({ request }) => {
  const { client } = getDatabaseClient(request);
  const editAPI = getResourceEditAPI(client);

  const [edits, newResources] = await Promise.all([
    editAPI.getEditsQueue(),
    editAPI.getNewResourcesQueue(),
  ]);

  return { edits, newResources };
};

type RowData = {
  id: number;
  kind: "EDIT" | "NEW";
  name: string | null;
  resource_type: ResourceEdit["resource_type"];
  resourceLabel: string;
  submitted_at: string;
};

const columns: ColumnDef<RowData>[] = [
  {
    accessorKey: "kind",
    header: "Kind",
    cell: ({ row }) => (
      <Chip
        label={row.original.kind === "NEW" ? "New" : "Edit"}
        size="small"
        variant={row.original.kind === "NEW" ? "filled" : "outlined"}
        color={row.original.kind === "NEW" ? "primary" : "default"}
      />
    ),
  },
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
    accessorKey: "submitted_at",
    header: "Submitted",
    cell: ({ row }) =>
      new Date(row.original.submitted_at).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
  },
];

const ReviewsQueue = () => {
  const { edits, newResources } = useLoaderData<{
    edits: ResourceEditQueueRow[];
    newResources: ResourceEdit[];
  }>();
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "submitted_at", desc: true },
  ]);

  const data: RowData[] = useMemo(
    () => [
      ...edits.map((edit) => ({
        id: edit.id,
        kind: "EDIT" as const,
        name: edit.name ?? null,
        resource_type: edit.resource_type,
        resourceLabel:
          edit.current_resource?.name ||
          edit.current_resource?.address ||
          `Resource #${edit.mapped_resource}`,
        submitted_at: edit.submitted_at,
      })),
      ...newResources.map((edit) => ({
        id: edit.id,
        kind: "NEW" as const,
        name: edit.name ?? null,
        resource_type: edit.resource_type,
        resourceLabel: "—",
        submitted_at: edit.submitted_at,
      })),
    ],
    [edits, newResources],
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
        Resource reviews
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Proposed edits to existing PHLask resources and brand-new site
        submissions, pending approval.
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
