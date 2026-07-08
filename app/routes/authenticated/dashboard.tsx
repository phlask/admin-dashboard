import {
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import type { LoaderFunction } from "react-router";
import { Link, useLoaderData } from "react-router";
import { getDatabaseClient } from "~/api/client.server";
import { getResourceRevisionAPI } from "~/api/resource-revisions/methods";
import { authMiddleware } from "~/middleware/auth";
import type { ResourceType } from "~/types/ResourceEntry";

export const middleware = [authMiddleware];

const RESOURCE_TYPES: ResourceType[] = ["WATER", "FOOD", "FORAGE", "BATHROOM"];

export const loader: LoaderFunction = async ({ request }) => {
  const { client } = getDatabaseClient(request);
  const revisionAPI = getResourceRevisionAPI(client);
  const revisions = await revisionAPI.getList();

  const submitterCounts = new Map<string, number>();
  const outstandingByType = new Map<string, number>();
  let pendingCount = 0;

  for (const revision of revisions) {
    const creator = revision.creator || "Unknown";
    submitterCounts.set(creator, (submitterCounts.get(creator) ?? 0) + 1);

    if (revision.status === "PENDING") {
      pendingCount += 1;
      outstandingByType.set(
        revision.resource_type,
        (outstandingByType.get(revision.resource_type) ?? 0) + 1,
      );
    }
  }

  const topSubmitters = [...submitterCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([creator, count]) => ({ creator, count }));

  const outstanding = RESOURCE_TYPES.map((type) => ({
    type,
    count: outstandingByType.get(type) ?? 0,
  }));

  return {
    totalRevisions: revisions.length,
    pendingCount,
    topSubmitters,
    outstanding,
  };
};

type LoaderData = {
  totalRevisions: number;
  pendingCount: number;
  topSubmitters: { creator: string; count: number }[];
  outstanding: { type: string; count: number }[];
};

const StatCard = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <Paper variant="outlined" sx={{ p: 2.5, flex: 1, minWidth: 200 }}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="h4" fontWeight={700}>
      {value}
    </Typography>
  </Paper>
);

const Dashboard = () => {
  const { totalRevisions, pendingCount, topSubmitters, outstanding } =
    useLoaderData<LoaderData>();

  return (
    <Stack gap={3}>
      <Box>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Dashboard overview
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Snapshot of resource edit submissions and review activity.
        </Typography>
      </Box>

      <Stack direction="row" gap={2} flexWrap="wrap">
        <StatCard label="Pending reviews" value={pendingCount} />
        <StatCard label="Total submissions" value={totalRevisions} />
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} gap={3}>
        <Paper variant="outlined" sx={{ p: 2.5, flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Outstanding by resource type
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableBody>
                {outstanding.map(({ type, count }) => (
                  <TableRow key={type}>
                    <TableCell>
                      <Chip label={type} size="small" />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {count}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography
            variant="body2"
            color="primary"
            component={Link}
            to="/reviews"
            sx={{ display: "inline-block", mt: 1.5 }}
          >
            View pending reviews →
          </Typography>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2.5, flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Top submitters
          </Typography>
          {topSubmitters.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No submissions yet.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableBody>
                  {topSubmitters.map(({ creator, count }) => (
                    <TableRow key={creator}>
                      <TableCell>{creator}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {count}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        <Paper variant="outlined" sx={{ p: 2.5, flex: 1, bgcolor: "grey.50" }}>
          <Tooltip title="resource_revisions has no reviewed_by column yet, so there's no record of who approved/rejected a given submission. Add that column (and set it in the approve/reject action) to unlock this.">
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Top approvers
            </Typography>
          </Tooltip>
          <Typography variant="body2" color="text.secondary">
            Not trackable yet — approvals don't record who approved them.
          </Typography>
        </Paper>
      </Stack>
    </Stack>
  );
};

export default Dashboard;
