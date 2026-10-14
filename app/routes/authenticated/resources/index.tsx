import {
  Box,
  Button,
  Chip,
  MenuItem,
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
import {
  Form,
  type LoaderFunction,
  Link as RouterLink,
  useLoaderData,
  useNavigate,
} from "react-router";
import { getDatabaseClient } from "~/api/client.server";
import { getResourceEditAPI } from "~/api/resource-edits/methods";
import { getResourceEntryAPI } from "~/api/resources/methods";
import { authMiddleware } from "~/middleware/auth";
import type {
  ResourceEntry,
  ResourceStatus,
  ResourceType,
} from "~/types/ResourceEntry";
import {
  resourceTypeChipColor,
  resourceTypeChipIcon,
} from "~/utils/chipColors";

export const middleware = [authMiddleware];

const PAGE_SIZE = 25;

const RESOURCE_TYPES: ResourceType[] = ["WATER", "FOOD", "FORAGE", "BATHROOM"];
const RESOURCE_STATUSES: ResourceStatus[] = [
  "OPERATIONAL",
  "TEMPORARILY_CLOSED",
  "PERMANENTLY_CLOSED",
  "NONOPERATIONAL",
  "HIDDEN",
];

type LoaderData = {
  resources: (ResourceEntry & { id: number })[];
  count: number;
  page: number;
  pendingByResource: Record<number, number>;
  filters: { q: string; type: string; status: string };
};

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const type = url.searchParams.get("type") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const requestedPage = Number(url.searchParams.get("page") ?? "1");
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const { client } = getDatabaseClient(request);
  const { data: resources, count } = await getResourceEntryAPI(client).getList({
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    resourceType: RESOURCE_TYPES.includes(type as ResourceType)
      ? (type as ResourceType)
      : undefined,
    status: RESOURCE_STATUSES.includes(status as ResourceStatus)
      ? (status as ResourceStatus)
      : undefined,
    search: q || undefined,
  });

  const ids = resources.map((resource) => Number(resource.id));
  const counts = ids.length
    ? await getResourceEditAPI(client).getEditCounts(ids)
    : [];

  return {
    // resources.id is a bigint in the DB; ResourceEntry types it loosely.
    resources: resources as LoaderData["resources"],
    count: count ?? 0,
    page,
    pendingByResource: Object.fromEntries(
      counts.map((row) => [row.resource_id, row.pending_count]),
    ),
    filters: { q, type, status },
  } satisfies LoaderData;
};

const ResourcesPage = () => {
  const { resources, count, page, pendingByResource, filters } =
    useLoaderData<LoaderData>();
  const navigate = useNavigate();

  const firstRow = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(page * PAGE_SIZE, count);
  const pageLink = (target: number) => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.type) params.set("type", filters.type);
    if (filters.status) params.set("status", filters.status);
    params.set("page", String(target));
    return `?${params}`;
  };

  return (
    <Stack gap={3}>
      <Box>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Resources
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Every resource on the live map. Open one to see its version history
          and roll back an approved change.
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack
          component={Form}
          method="get"
          direction={{ xs: "column", md: "row" }}
          gap={2}
          alignItems={{ md: "center" }}
        >
          <TextField
            name="q"
            label="Search name or address"
            size="small"
            defaultValue={filters.q}
            sx={{ flex: 2 }}
          />
          <TextField
            select
            name="type"
            label="Type"
            size="small"
            defaultValue={filters.type}
            sx={{ flex: 1, minWidth: 140 }}
          >
            <MenuItem value="">All types</MenuItem>
            {RESOURCE_TYPES.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            name="status"
            label="Status"
            size="small"
            defaultValue={filters.status}
            sx={{ flex: 1, minWidth: 180 }}
          >
            <MenuItem value="">All statuses</MenuItem>
            {RESOURCE_STATUSES.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </TextField>
          <Button type="submit" variant="contained">
            Search
          </Button>
        </Stack>
      </Paper>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow sx={{ "& th": { fontWeight: 600 } }}>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Address</TableCell>
              <TableCell align="right">Pending edits</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {resources.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary" sx={{ py: 3 }}>
                    No resources match these filters.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {resources.map((resource) => {
              const pending = pendingByResource[Number(resource.id)] ?? 0;
              return (
                <TableRow
                  key={resource.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => navigate(`/resources/${resource.id}`)}
                >
                  <TableCell>{resource.id}</TableCell>
                  <TableCell>{resource.name || "—"}</TableCell>
                  <TableCell>
                    <Chip
                      label={resource.resource_type}
                      size="small"
                      icon={resourceTypeChipIcon(resource.resource_type)}
                      color={resourceTypeChipColor(resource.resource_type)}
                    />
                  </TableCell>
                  <TableCell>{resource.status ?? "—"}</TableCell>
                  <TableCell>{resource.address || "—"}</TableCell>
                  <TableCell align="right">
                    {pending > 0 ? (
                      <Chip label={pending} size="small" color="warning" />
                    ) : (
                      0
                    )}
                  </TableCell>
                </TableRow>
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

export default ResourcesPage;
