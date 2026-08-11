import { HourglassTop, PendingActions, WaterDrop } from "@mui/icons-material";
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
  Typography,
} from "@mui/material";
import type { LoaderFunction } from "react-router";
import { Link, useLoaderData } from "react-router";
import { getDatabaseClient } from "~/api/client.server";
import { getResourceEditAPI } from "~/api/resource-edits/methods";
import { authMiddleware } from "~/middleware/auth";
import type { ResourceType } from "~/types/ResourceEntry";
import {
  resourceTypeChipColor,
  resourceTypeChipIcon,
} from "~/utils/chipColors";

export const middleware = [authMiddleware];

const RESOURCE_TYPES: ResourceType[] = ["WATER", "FOOD", "FORAGE", "BATHROOM"];

export const loader: LoaderFunction = async ({ request }) => {
  const { client } = getDatabaseClient(request);
  const editAPI = getResourceEditAPI(client);
  const edits = await editAPI.getList();

  const submitterCounts = new Map<string, number>();
  const approverCounts = new Map<string, number>();
  const outstandingByType = new Map<string, number>();
  let pendingCount = 0;

  for (const edit of edits) {
    const creator = edit.creator || "Unknown";
    submitterCounts.set(creator, (submitterCounts.get(creator) ?? 0) + 1);

    if (edit.review_status === "PENDING") {
      pendingCount += 1;
      outstandingByType.set(
        edit.resource_type,
        (outstandingByType.get(edit.resource_type) ?? 0) + 1,
      );
    }

    if (edit.review_status === "APPROVED" && edit.reviewed_by) {
      approverCounts.set(
        edit.reviewed_by,
        (approverCounts.get(edit.reviewed_by) ?? 0) + 1,
      );
    }
  }

  const topSubmitters = [...submitterCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([creator, count]) => ({ creator, count }));

  const topApprovers = [...approverCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reviewer, count]) => ({ reviewer, count }));

  const outstanding = RESOURCE_TYPES.map((type) => ({
    type,
    count: outstandingByType.get(type) ?? 0,
  }));

  return {
    totalEdits: edits.length,
    pendingCount,
    topSubmitters,
    topApprovers,
    outstanding,
  };
};

type LoaderData = {
  totalEdits: number;
  pendingCount: number;
  topSubmitters: { creator: string; count: number }[];
  topApprovers: { reviewer: string; count: number }[];
  outstanding: { type: string; count: number }[];
};

const StatCard = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) => (
  <Paper
    variant="outlined"
    sx={{
      p: 2.5,
      flex: 1,
      minWidth: 200,
      display: "flex",
      alignItems: "center",
      gap: 2,
    }}
  >
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 48,
        height: 48,
        borderRadius: "14px",
        background: "linear-gradient(135deg, #38c1ff, #0090de)",
        color: "#fff",
        flexShrink: 0,
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4" fontWeight={700}>
        {value}
      </Typography>
    </Box>
  </Paper>
);

const Dashboard = () => {
  const {
    totalEdits,
    pendingCount,
    topSubmitters,
    topApprovers,
    outstanding,
  } = useLoaderData<LoaderData>();

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
        <StatCard
          label="Pending reviews"
          value={pendingCount}
          icon={<PendingActions fontSize="small" />}
        />
        <StatCard
          label="Total submissions"
          value={totalEdits}
          icon={<HourglassTop fontSize="small" />}
        />
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} gap={3}>
        <Paper variant="outlined" sx={{ p: 2.5, flex: 1 }}>
          <Stack direction="row" alignItems="center" gap={0.75} mb={1}>
            <WaterDrop fontSize="small" color="primary" />
            <Typography variant="subtitle1" fontWeight={600}>
              Outstanding by resource type
            </Typography>
          </Stack>
          <TableContainer>
            <Table size="small">
              <TableBody>
                {outstanding.map(({ type, count }) => (
                  <TableRow key={type}>
                    <TableCell>
                      <Chip
                        label={type}
                        size="small"
                        icon={resourceTypeChipIcon(type)}
                        color={resourceTypeChipColor(type)}
                      />
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

        <Paper variant="outlined" sx={{ p: 2.5, flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Top approvers
          </Typography>
          {topApprovers.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No approvals yet.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableBody>
                  {topApprovers.map(({ reviewer, count }) => (
                    <TableRow key={reviewer}>
                      <TableCell>{reviewer}</TableCell>
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
      </Stack>
    </Stack>
  );
};

export default Dashboard;
