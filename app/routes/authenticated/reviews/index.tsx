import {
  Chip,
  Paper,
  Stack,
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
import type {
  ResourceEdit,
  ResourceEditCount,
  ResourceEditQueueRow,
} from "~/types/ResourceEdit";
import {
  resourceTypeChipColor,
  resourceTypeChipIcon,
} from "~/utils/chipColors";

export const middleware = [authMiddleware];

export const loader: LoaderFunction = async ({ request }) => {
  const { client } = getDatabaseClient(request);
  const editAPI = getResourceEditAPI(client);

  const [edits, newResources, editCounts] = await Promise.all([
    editAPI.getEditsQueue(),
    editAPI.getNewResourcesQueue(),
    editAPI.getEditCounts(),
  ]);

  return { edits, newResources, editCounts };
};

type EditRowData = {
  id: number;
  name: string | null;
  resource_type: ResourceEdit["resource_type"];
  resourceLabel: string;
  submitted_at: string;
  /** How many PENDING edits (including this one) target the same resource. */
  competingEdits: number;
};

type NewRowData = {
  id: number;
  name: string | null;
  resource_type: ResourceEdit["resource_type"];
  submitted_at: string;
};

const submittedColumn = <
  T extends { submitted_at: string },
>(): ColumnDef<T> => ({
  accessorKey: "submitted_at",
  header: "Submitted",
  cell: ({ row }) =>
    new Date(row.original.submitted_at).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }),
});

const editColumns: ColumnDef<EditRowData>[] = [
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
    accessorKey: "competingEdits",
    header: "Pending edits",
    cell: ({ row }) =>
      row.original.competingEdits > 1 ? (
        <Chip
          label={row.original.competingEdits}
          size="small"
          color="warning"
        />
      ) : (
        row.original.competingEdits || "—"
      ),
  },
  submittedColumn<EditRowData>(),
];

const newColumns: ColumnDef<NewRowData>[] = [
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
  submittedColumn<NewRowData>(),
];

type ReviewQueueTableProps<T extends { id: number }> = {
  data: T[];
  columns: ColumnDef<T>[];
  emptyMessage: string;
};

function ReviewQueueTable<T extends { id: number }>({
  data,
  columns,
  emptyMessage,
}: ReviewQueueTableProps<T>) {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "submitted_at", desc: true },
  ]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
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
                  {emptyMessage}
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
  );
}

const ReviewsQueue = () => {
  const { edits, newResources, editCounts } = useLoaderData<{
    edits: ResourceEditQueueRow[];
    newResources: ResourceEdit[];
    editCounts: ResourceEditCount[];
  }>();

  const pendingCountByResource = useMemo(
    () => new Map(editCounts.map((c) => [c.resource_id, c.pending_count])),
    [editCounts],
  );

  const editData: EditRowData[] = useMemo(
    () =>
      edits.map((edit) => ({
        id: edit.id,
        name: edit.name ?? null,
        resource_type: edit.resource_type,
        resourceLabel:
          edit.current_resource?.name ||
          edit.current_resource?.address ||
          `Resource #${edit.mapped_resource}`,
        submitted_at: edit.submitted_at,
        competingEdits: edit.mapped_resource
          ? (pendingCountByResource.get(edit.mapped_resource) ?? 1)
          : 0,
      })),
    [edits, pendingCountByResource],
  );

  const newData: NewRowData[] = useMemo(
    () =>
      newResources.map((edit) => ({
        id: edit.id,
        name: edit.name ?? null,
        resource_type: edit.resource_type,
        submitted_at: edit.submitted_at,
      })),
    [newResources],
  );

  return (
    <Stack gap={4}>
      <div>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Resource reviews
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Proposed edits to existing PHLask resources and brand-new site
          submissions, pending approval.
        </Typography>
      </div>

      <div>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          New site submissions
        </Typography>
        <ReviewQueueTable
          data={newData}
          columns={newColumns}
          emptyMessage="No pending new-site submissions."
        />
      </div>

      <div>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Edits to existing resources
        </Typography>
        <ReviewQueueTable
          data={editData}
          columns={editColumns}
          emptyMessage="No pending edits."
        />
      </div>
    </Stack>
  );
};

export default ReviewsQueue;
