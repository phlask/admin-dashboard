import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUp from "@mui/icons-material/KeyboardArrowUp";
import {
  Box,
  Button,
  Chip,
  type ChipProps,
  Collapse,
  IconButton,
  MenuItem,
  Link as MuiLink,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Fragment, useState } from "react";
import {
  Form,
  type LoaderFunction,
  Link as RouterLink,
  useLoaderData,
} from "react-router";
import { getAuditLogAPI } from "~/api/audit-log/methods";
import { getDatabaseClient } from "~/api/client.server";
import { authMiddleware } from "~/middleware/auth";
import type {
  AuditAction,
  AuditedTable,
  AuditLogEntry,
} from "~/types/AuditLog";

export const middleware = [authMiddleware];

const PAGE_SIZE = 50;

const ACTIONS: AuditAction[] = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "APPROVE",
  "REJECT",
  "ROLLBACK",
];
const TABLES: { value: AuditedTable; label: string }[] = [
  { value: "resource_edits", label: "Submissions / edits" },
  { value: "resources", label: "Resources" },
  { value: "providers", label: "Providers" },
];

const ACTION_COLORS: Record<AuditAction, ChipProps["color"]> = {
  INSERT: "info",
  UPDATE: "default",
  DELETE: "error",
  APPROVE: "success",
  REJECT: "warning",
  ROLLBACK: "secondary",
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type Filters = {
  actor: string;
  action: string;
  table: string;
  record: string;
  from: string;
  to: string;
  order: "desc" | "asc";
};

type LoaderData = {
  entries: AuditLogEntry[];
  count: number;
  page: number;
  filters: Filters;
};

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const get = (key: string) => url.searchParams.get(key)?.trim() ?? "";

  const filters: Filters = {
    actor: get("actor"),
    action: ACTIONS.includes(get("action") as AuditAction) ? get("action") : "",
    table: TABLES.some((t) => t.value === get("table")) ? get("table") : "",
    record: /^\d+$/.test(get("record")) ? get("record") : "",
    from: DATE_PATTERN.test(get("from")) ? get("from") : "",
    to: DATE_PATTERN.test(get("to")) ? get("to") : "",
    order: get("order") === "asc" ? "asc" : "desc",
  };
  const requestedPage = Number(get("page") || "1");
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const { client } = getDatabaseClient(request);
  const { data: entries, count } = await getAuditLogAPI(client).getList({
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    actor: filters.actor || undefined,
    action: filters.action || undefined,
    tableName: filters.table || undefined,
    recordId: filters.record || undefined,
    // Whole UTC days, inclusive.
    from: filters.from ? `${filters.from}T00:00:00Z` : undefined,
    to: filters.to ? `${filters.to}T23:59:59.999Z` : undefined,
    ascending: filters.order === "asc",
  });

  return { entries, count, page, filters } satisfies LoaderData;
};

const recordLink = (entry: AuditLogEntry) => {
  if (!entry.record_id) {
    return null;
  }
  switch (entry.table_name) {
    case "resource_edits":
      return `/reviews/${entry.record_id}`;
    case "resources":
      return `/resources/${entry.record_id}`;
    case "providers":
      return "/providers";
    default:
      return null;
  }
};

const tableLabel = (table: string) =>
  TABLES.find((t) => t.value === table)?.label ?? table;

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return typeof value === "object" ? JSON.stringify(value) : String(value);
};

const EntryDetails = ({ entry }: { entry: AuditLogEntry }) => {
  const fields =
    entry.action === "INSERT" || entry.action === "DELETE"
      ? Object.keys(entry.new_data ?? entry.old_data ?? {})
      : entry.changed_fields;

  return (
    <Table size="small" sx={{ tableLayout: "fixed" }}>
      <TableHead>
        <TableRow sx={{ "& th": { fontWeight: 600 } }}>
          <TableCell sx={{ width: 200 }}>Field</TableCell>
          <TableCell>Before</TableCell>
          <TableCell>After</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {fields.map((field) => (
          <TableRow key={field}>
            <TableCell sx={{ color: "text.secondary" }}>{field}</TableCell>
            <TableCell sx={{ wordBreak: "break-word" }}>
              {formatValue(entry.old_data?.[field])}
            </TableCell>
            <TableCell sx={{ wordBreak: "break-word" }}>
              {formatValue(entry.new_data?.[field])}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const AuditLogsPage = () => {
  const { entries, count, page, filters } = useLoaderData<LoaderData>();
  const [expanded, setExpanded] = useState<number | null>(null);

  const firstRow = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(page * PAGE_SIZE, count);
  const pageLink = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value && !(key === "order" && value === "desc")) {
        params.set(key, value);
      }
    }
    params.set("page", String(target));
    return `?${params}`;
  };

  return (
    <Stack gap={3}>
      <Box>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Audit log
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Every change to submissions, resources and providers — from this
          dashboard, the map or the database directly. Entries can't be edited
          or deleted.
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack
          component={Form}
          method="get"
          direction="row"
          flexWrap="wrap"
          gap={2}
          alignItems="center"
        >
          <TextField
            name="actor"
            label="User"
            size="small"
            defaultValue={filters.actor}
            sx={{ minWidth: 200, flex: 1 }}
          />
          <TextField
            select
            name="action"
            label="Action"
            size="small"
            defaultValue={filters.action}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">All actions</MenuItem>
            {ACTIONS.map((action) => (
              <MenuItem key={action} value={action}>
                {action}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            name="table"
            label="Record type"
            size="small"
            defaultValue={filters.table}
            sx={{ minWidth: 190 }}
          >
            <MenuItem value="">All records</MenuItem>
            {TABLES.map((table) => (
              <MenuItem key={table.value} value={table.value}>
                {table.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            name="record"
            label="Record ID"
            size="small"
            defaultValue={filters.record}
            slotProps={{ htmlInput: { inputMode: "numeric" } }}
            sx={{ width: 120 }}
          />
          <TextField
            name="from"
            label="From (UTC)"
            type="date"
            size="small"
            defaultValue={filters.from}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            name="to"
            label="To (UTC)"
            type="date"
            size="small"
            defaultValue={filters.to}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            select
            name="order"
            label="Sort"
            size="small"
            defaultValue={filters.order}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="desc">Newest first</MenuItem>
            <MenuItem value="asc">Oldest first</MenuItem>
          </TextField>
          <Button type="submit" variant="contained">
            Filter
          </Button>
          <Button component={RouterLink} to="/audit-logs">
            Reset
          </Button>
        </Stack>
      </Paper>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ "& th": { fontWeight: 600 } }}>
              <TableCell sx={{ width: 48 }} />
              <TableCell>When</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Record</TableCell>
              <TableCell>Changed</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary" sx={{ py: 3 }}>
                    No activity matches these filters.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {entries.map((entry) => {
              const isOpen = expanded === entry.id;
              const link = recordLink(entry);
              return (
                <Fragment key={entry.id}>
                  <TableRow hover sx={{ "& > td": { borderBottom: "unset" } }}>
                    <TableCell>
                      <IconButton
                        size="small"
                        aria-label={isOpen ? "Hide details" : "Show details"}
                        onClick={() => setExpanded(isOpen ? null : entry.id)}
                      >
                        {isOpen ? (
                          <KeyboardArrowUp fontSize="small" />
                        ) : (
                          <KeyboardArrowDown fontSize="small" />
                        )}
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {new Date(entry.occurred_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "medium",
                      })}
                    </TableCell>
                    <TableCell sx={{ overflowWrap: "anywhere", minWidth: 160 }}>
                      {entry.actor}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={entry.action}
                        size="small"
                        color={ACTION_COLORS[entry.action] ?? "default"}
                      />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {tableLabel(entry.table_name)}{" "}
                      {link ? (
                        <MuiLink component={RouterLink} to={link}>
                          #{entry.record_id}
                        </MuiLink>
                      ) : entry.record_id ? (
                        `#${entry.record_id}`
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" gap={0.5} flexWrap="wrap">
                        {entry.changed_fields.map((field) => (
                          <Chip
                            key={field}
                            label={field}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Stack>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={6} sx={{ py: 0 }}>
                      <Collapse in={isOpen} unmountOnExit>
                        <Box sx={{ py: 1.5 }}>
                          <EntryDetails entry={entry} />
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack direction="row" alignItems="center" gap={2}>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          {count === 0
            ? "No results"
            : `Showing ${firstRow}–${lastRow} of ${count}`}
        </Typography>
        <Button
          component={RouterLink}
          to={pageLink(page - 1)}
          disabled={page <= 1}
          variant="outlined"
          size="small"
        >
          Previous
        </Button>
        <Button
          component={RouterLink}
          to={pageLink(page + 1)}
          disabled={lastRow >= count}
          variant="outlined"
          size="small"
        >
          Next
        </Button>
      </Stack>
    </Stack>
  );
};

export default AuditLogsPage;
