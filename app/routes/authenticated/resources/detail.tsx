import ArrowBack from "@mui/icons-material/ArrowBack";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link as MuiLink,
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
import { useState } from "react";
import {
  type ActionFunction,
  data,
  Form,
  type LoaderFunction,
  Link as RouterLink,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { getDatabaseClient } from "~/api/client.server";
import { getResourceEditAPI } from "~/api/resource-edits/methods";
import { getResourceEntryAPI } from "~/api/resources/methods";
import { userContext } from "~/context/user";
import { authMiddleware } from "~/middleware/auth";
import type { ResourceEdit, ResourceHistoryEntry } from "~/types/ResourceEdit";
import type { ResourceEntry } from "~/types/ResourceEntry";
import {
  resourceTypeChipColor,
  resourceTypeChipIcon,
  statusChipColor,
} from "~/utils/chipColors";
import { valuesDiffer } from "~/utils/resourceDiff";

export const middleware = [authMiddleware];

type LiveResource = ResourceEntry & { id: number };
type PendingEdit = Pick<
  ResourceEdit,
  "id" | "name" | "submitted_by" | "submitted_at"
>;

type LoaderData = {
  resource: LiveResource;
  history: ResourceHistoryEntry[];
  pending: PendingEdit[];
};

type ActionData = { ok: boolean; message: string };

/** Bookkeeping columns that differ between any two versions and say nothing
 * about the resource itself. */
const IGNORED_FIELDS = new Set([
  "id",
  "date_created",
  "creator",
  "last_modified",
  "last_modifier",
]);

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  resource_type: "Resource type",
  status: "Status",
  entry_type: "Entry type",
  description: "Description",
  guidelines: "Guidelines",
  address: "Address",
  city: "City",
  state: "State",
  zip_code: "Zip code",
  latitude: "Latitude",
  longitude: "Longitude",
  gp_id: "Google Place ID",
  hours: "Hours",
  images: "Images",
  water: "Water details",
  food: "Food details",
  forage: "Forage details",
  bathroom: "Bathroom details",
  source: "Source",
  verification: "Verification",
  version: "Schema version",
};

const changedKeys = (
  before: Record<string, unknown>,
  after: Record<string, unknown>,
) =>
  [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((key) => !IGNORED_FIELDS.has(key))
    .filter((key) => valuesDiffer(before[key], after[key]));

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

const parseId = (value: unknown) => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const id = parseId(params.id);
  if (id === null) {
    throw data("Not found", { status: 404 });
  }

  const { client } = getDatabaseClient(request);
  const editAPI = getResourceEditAPI(client);

  const [resource, history, pending] = await Promise.all([
    getResourceEntryAPI(client)
      .getById(id)
      .catch(() => null),
    editAPI.getHistoryForResource(id),
    editAPI.getOtherPendingForResource(id, 0),
  ]);

  if (!resource) {
    throw data("Resource not found", { status: 404 });
  }

  return { resource, history, pending } as LoaderData;
};

export const action: ActionFunction = async ({ request, params, context }) => {
  const id = parseId(params.id);
  if (id === null) {
    throw data("Not found", { status: 404 });
  }

  const formData = await request.formData();
  const editId = parseId(formData.get("editId"));
  if (formData.get("intent") !== "rollback" || editId === null) {
    return data<ActionData>(
      { ok: false, message: "Unknown action" },
      { status: 400 },
    );
  }

  const { client } = getDatabaseClient(request);
  const actor = context.get(userContext)?.email ?? "unknown";

  try {
    await getResourceEditAPI(client).rollback(editId, actor);
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : "";
    return data<ActionData>(
      { ok: false, message: `Rollback failed.${detail}` },
      { status: 400 },
    );
  }

  return data<ActionData>({
    ok: true,
    message: `Rolled back to the version from edit #${editId}.`,
  });
};

const ResourceHistoryPage = () => {
  const { resource, history, pending } = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const [target, setTarget] = useState<ResourceHistoryEntry | null>(null);

  const current = resource as unknown as Record<string, unknown>;

  // Oldest → newest approved snapshots, to diff each version against the one
  // before it.
  const approved = history
    .filter((entry) => entry.review_status === "APPROVED")
    .reverse();
  const previousSnapshot = new Map<number, Record<string, unknown> | null>();
  approved.forEach((entry, index) => {
    const before = approved[index - 1]?.applied_snapshot ?? null;
    previousSnapshot.set(
      entry.id,
      before as unknown as Record<string, unknown> | null,
    );
  });

  const targetChanges =
    target?.applied_snapshot != null
      ? changedKeys(
          current,
          target.applied_snapshot as unknown as Record<string, unknown>,
        )
      : null;

  return (
    <Stack gap={3}>
      <Typography
        component={RouterLink}
        to="/resources"
        color="text.secondary"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          textDecoration: "none",
          "&:hover": { color: "primary.main" },
        }}
      >
        <ArrowBack fontSize="small" />
        All resources
      </Typography>

      <Box>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          {resource.name || `Resource #${resource.id}`}
        </Typography>
        <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
          <Chip
            label={resource.resource_type}
            size="small"
            icon={resourceTypeChipIcon(resource.resource_type)}
            color={resourceTypeChipColor(resource.resource_type)}
          />
          <Chip
            label={resource.status ?? "—"}
            size="small"
            variant="outlined"
          />
          <Typography variant="body2" color="text.secondary">
            #{resource.id} · {resource.address || "No address"} · last modified{" "}
            {formatDate(resource.last_modified)}
          </Typography>
        </Stack>
      </Box>

      {actionData?.message && (
        <Alert severity={actionData.ok ? "success" : "error"}>
          {actionData.message}
        </Alert>
      )}

      {pending.length > 0 && (
        <Alert severity="info">
          {pending.length === 1 ? "1 edit is" : `${pending.length} edits are`}{" "}
          waiting for review:{" "}
          {pending.map((edit, index) => (
            <span key={edit.id}>
              {index > 0 && ", "}
              <MuiLink
                component={RouterLink}
                to={`/reviews/${edit.id}`}
                color="inherit"
                fontWeight={600}
              >
                #{edit.id}
              </MuiLink>
            </span>
          ))}
        </Alert>
      )}

      <Box>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Version history
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 600 } }}>
                <TableCell>Decided</TableCell>
                <TableCell>Outcome</TableCell>
                <TableCell>Submitted by</TableCell>
                <TableCell>Reviewed by</TableCell>
                <TableCell>Changes</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      No reviewed edits for this resource yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {history.map((entry) => {
                const snapshot = entry.applied_snapshot as unknown as Record<
                  string,
                  unknown
                > | null;
                const before = previousSnapshot.get(entry.id) ?? null;
                const changes =
                  snapshot && before ? changedKeys(before, snapshot) : null;
                const isCurrent =
                  snapshot !== null &&
                  changedKeys(current, snapshot).length === 0;

                return (
                  <TableRow key={entry.id}>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {formatDate(entry.reviewed_at)}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" gap={1} alignItems="center">
                        <Chip
                          label={entry.review_status}
                          size="small"
                          color={statusChipColor(entry.review_status)}
                        />
                        <MuiLink
                          component={RouterLink}
                          to={`/reviews/${entry.id}`}
                          variant="body2"
                        >
                          #{entry.id}
                        </MuiLink>
                        {isCurrent && (
                          <Chip
                            label="Current version"
                            size="small"
                            variant="outlined"
                            color="success"
                          />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>{entry.submitted_by ?? "—"}</TableCell>
                    <TableCell>{entry.reviewed_by ?? "—"}</TableCell>
                    <TableCell>
                      {entry.review_status === "REJECTED" ? (
                        <Typography variant="body2" color="text.secondary">
                          {entry.review_notes
                            ? `Reason: ${entry.review_notes}`
                            : "No reason given"}
                        </Typography>
                      ) : changes ? (
                        <Stack direction="row" gap={0.5} flexWrap="wrap">
                          {changes.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                              No field changes
                            </Typography>
                          ) : (
                            changes.map((key) => (
                              <Chip
                                key={key}
                                label={FIELD_LABELS[key] ?? key}
                                size="small"
                                variant="outlined"
                              />
                            ))
                          )}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {snapshot ? "First recorded version" : "Not recorded"}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {entry.review_status === "APPROVED" && (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={isCurrent}
                          onClick={() => setTarget(entry)}
                          sx={{ whiteSpace: "nowrap" }}
                        >
                          Roll back to this
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Dialog
        open={target !== null}
        onClose={() => setTarget(null)}
        fullWidth
        maxWidth="sm"
      >
        <Form method="post" onSubmit={() => setTarget(null)}>
          <input type="hidden" name="intent" value="rollback" />
          <input type="hidden" name="editId" value={target?.id ?? ""} />
          <DialogTitle>Roll back to edit #{target?.id}?</DialogTitle>
          <DialogContent>
            {targetChanges === null ? (
              <DialogContentText>
                This edit was approved before full version snapshots were
                recorded, so rolling back re-applies the fields that edit set.
                Fields it didn't touch keep their current values.
              </DialogContentText>
            ) : targetChanges.length === 0 ? (
              <DialogContentText>
                The live resource already matches this version.
              </DialogContentText>
            ) : (
              <>
                <DialogContentText sx={{ mb: 1.5 }}>
                  The live resource will be restored to this version. These
                  fields will change on the map:
                </DialogContentText>
                <Stack direction="row" gap={0.5} flexWrap="wrap">
                  {targetChanges.map((key) => (
                    <Chip
                      key={key}
                      label={FIELD_LABELS[key] ?? key}
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button type="button" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="warning"
              loading={navigation.state === "submitting"}
            >
              Roll back
            </Button>
          </DialogActions>
        </Form>
      </Dialog>
    </Stack>
  );
};

export default ResourceHistoryPage;
