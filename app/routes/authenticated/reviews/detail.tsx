import ArrowBack from "@mui/icons-material/ArrowBack";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  type ReactNode,
  type SubmitEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type ActionFunction,
  data,
  Form,
  type LoaderFunction,
  Link as RouterLink,
  redirect,
  useActionData,
  useFetcher,
  useLoaderData,
} from "react-router";
import { getDatabaseClient } from "~/api/client.server";
import { getResourceEditAPI } from "~/api/resource-edits/methods";
import { getResourceEntryAPI } from "~/api/resources/methods";
import ResourceLocationPanel from "~/components/ResourceLocationPanel";
import { userContext } from "~/context/user";
import { authMiddleware } from "~/middleware/auth";
import type {
  ResourceChangeLogEntry,
  ResourceEdit,
} from "~/types/ResourceEdit";
import type {
  BathroomTag,
  DispenserType,
  DistributionType,
  EntryType,
  FoodType,
  ForageTag,
  ForageType,
  OrganizationType,
  ResourceEntry,
  ResourceStatus,
  ResourceType,
  WaterTag,
} from "~/types/ResourceEntry";
import { statusChipColor } from "~/utils/chipColors";
import { valuesDiffer } from "~/utils/resourceDiff";

export const middleware = [authMiddleware];

const RESOURCE_TYPES: ResourceType[] = ["WATER", "FOOD", "FORAGE", "BATHROOM"];
const ENTRY_TYPES: EntryType[] = ["OPEN", "RESTRICTED", "UNSURE"];
const RESOURCE_STATUSES: ResourceStatus[] = [
  "OPERATIONAL",
  "TEMPORARILY_CLOSED",
  "PERMANENTLY_CLOSED",
  "NONOPERATIONAL",
  "HIDDEN",
];
const DISPENSER_TYPES: DispenserType[] = [
  "DRINKING_FOUNTAIN",
  "BOTTLE_FILLER",
  "SINK",
  "JUG",
  "SODA_MACHINE",
  "VESSEL",
  "WATER_COOLER",
];
const WATER_TAGS: WaterTag[] = [
  "WHEELCHAIR_ACCESSIBLE",
  "FILTERED",
  "BYOB",
  "ID_REQUIRED",
];
const FOOD_TYPES: FoodType[] = ["PERISHABLE", "NON_PERISHABLE", "PREPARED"];
const DISTRIBUTION_TYPES: DistributionType[] = [
  "EAT_ON_SITE",
  "DELIVERY",
  "PICKUP",
];
const ORGANIZATION_TYPES: OrganizationType[] = [
  "GOVERNMENT",
  "BUSINESS",
  "NON_PROFIT",
  "UNSURE",
];
const FORAGE_TYPES: ForageType[] = [
  "NUT",
  "FRUIT",
  "LEAVES",
  "BARK",
  "FLOWERS",
];
const FORAGE_TAGS: ForageTag[] = ["MEDICINAL", "IN_SEASON", "COMMUNITY_GARDEN"];
const BATHROOM_TAGS: BathroomTag[] = [
  "WHEELCHAIR_ACCESSIBLE",
  "GENDER_NEUTRAL",
  "CHANGING_TABLE",
  "SINGLE_OCCUPANCY",
  "HAS_FOUNTAIN",
  "FAMILY",
];

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
};

type EditableValues = {
  name: string;
  resource_type: ResourceType;
  status: ResourceStatus | "";
  entry_type: EntryType | "";
  address: string;
  city: string;
  state: string;
  zip_code: string;
  latitude: number;
  longitude: number;
  description: string;
  guidelines: string;
  water: { dispenser_type: DispenserType[]; tags: WaterTag[] };
  food: {
    food_type: FoodType[];
    distribution_type: DistributionType[];
    organization_type: OrganizationType | "";
    organization_name: string;
    organization_url: string;
    tags: string[];
  };
  forage: { forage_type: ForageType[]; tags: ForageTag[] };
  bathroom: { tags: BathroomTag[] };
};

// phlask-map stores organization_type as a single value, but rows written
// before its January 2026 schema change hold an array — accept either.
const toOrganizationType = (value: unknown): OrganizationType | "" => {
  const single = Array.isArray(value) ? value[0] : value;
  return typeof single === "string" ? (single as OrganizationType) : "";
};

// Accepts the live resource too, so both sides of the compare go through the
// same normalisation (e.g. legacy array-valued organization_type).
const toEditableValues = (edit: ResourceEntry): EditableValues => ({
  name: edit.name ?? "",
  resource_type: edit.resource_type,
  status: edit.status ?? "",
  entry_type: edit.entry_type ?? "",
  address: edit.address ?? "",
  city: edit.city ?? "",
  state: edit.state ?? "",
  zip_code: edit.zip_code ?? "",
  latitude: edit.latitude,
  longitude: edit.longitude,
  description: edit.description ?? "",
  guidelines: edit.guidelines ?? "",
  water: {
    dispenser_type: edit.water?.dispenser_type ?? [],
    tags: edit.water?.tags ?? [],
  },
  food: {
    food_type: edit.food?.food_type ?? [],
    distribution_type: edit.food?.distribution_type ?? [],
    organization_type: toOrganizationType(edit.food?.organization_type),
    organization_name: edit.food?.organization_name ?? "",
    organization_url: edit.food?.organization_url ?? "",
    // Not editable here, but carried through so saving doesn't drop it.
    tags: edit.food?.tags ?? [],
  },
  forage: {
    forage_type: edit.forage?.forage_type ?? [],
    tags: edit.forage?.tags ?? [],
  },
  bathroom: {
    tags: edit.bathroom?.tags ?? [],
  },
});

export const loader: LoaderFunction = async ({ request, params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    throw data("Not found", { status: 404 });
  }

  const { client } = getDatabaseClient(request);
  const editAPI = getResourceEditAPI(client);
  const edit = await editAPI.getById(id);

  let resource: ResourceEntry | null = null;
  let changeLog: ResourceChangeLogEntry[] = [];
  if (edit.mapped_resource !== null) {
    const resourceAPI = getResourceEntryAPI(client);

    [resource, changeLog] = await Promise.all([
      resourceAPI.getById(edit.mapped_resource).catch(() => null),
      editAPI.getChangeLogForResource(edit.mapped_resource).catch(() => []),
    ]);
  }

  return { edit, resource, changeLog };
};

export const action: ActionFunction = async ({ request, params, context }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    throw data("Not found", { status: 404 });
  }

  const { client, headers } = getDatabaseClient(request);
  const editAPI = getResourceEditAPI(client);
  const reviewer = context.get(userContext)?.email ?? "unknown";
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await request.json();

    if (body.intent !== "save") {
      return data({ message: "Unknown action" }, { status: 400 });
    }

    try {
      const updated = await editAPI.updateFields(id, body.values);
      return data({ message: "Changes saved.", ok: true, edit: updated });
    } catch {
      return data({ message: "Failed to save changes." }, { status: 400 });
    }
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent !== "approve" && intent !== "reject") {
    return data({ message: "Unknown action" }, { status: 400 });
  }

  try {
    if (intent === "approve") {
      await editAPI.approve(id, reviewer);
    } else {
      await editAPI.reject(id, reviewer);
    }
  } catch (error) {
    return data(
      {
        message:
          error instanceof Error ? error.message : "Failed to review edit.",
      },
      { status: 400 },
    );
  }

  return redirect("/reviews", { headers });
};

/** The resource fields as the review form would write them. */
const toPayload = (values: EditableValues): Partial<ResourceEntry> => ({
  name: values.name || null,
  resource_type: values.resource_type,
  // status is NOT NULL-able in spirit (every resource has one); leave it
  // out of the payload rather than blanking it if the field is empty.
  ...(values.status ? { status: values.status } : {}),
  entry_type: values.entry_type || null,
  address: values.address || null,
  city: values.city || null,
  state: values.state || null,
  zip_code: values.zip_code || null,
  latitude: values.latitude,
  longitude: values.longitude,
  description: values.description || null,
  guidelines: values.guidelines || null,
  water: values.resource_type === "WATER" ? values.water : null,
  food:
    values.resource_type === "FOOD"
      ? {
          ...values.food,
          organization_type: values.food.organization_type || undefined,
          organization_name: values.food.organization_name || undefined,
          organization_url: values.food.organization_url || undefined,
        }
      : null,
  forage: values.resource_type === "FORAGE" ? values.forage : null,
  bathroom: values.resource_type === "BATHROOM" ? values.bathroom : null,
});

/**
 * What approving this edit would actually set: a NULL column on an edit means
 * "leave unchanged" (see the partial-apply migration), so it shows the current
 * value — unless the field is listed in cleared_fields.
 */
const effectiveProposal = (
  edit: ResourceEdit,
  resource: ResourceEntry | null,
): ResourceEntry => {
  if (!resource) {
    return edit;
  }
  const cleared = new Set(edit.cleared_fields ?? []);
  const merged: Record<string, unknown> = { ...edit };
  for (const [key, currentValue] of Object.entries(resource)) {
    if (key in merged && merged[key] === null && !cleared.has(key)) {
      merged[key] = currentValue;
    }
  }
  return merged as ResourceEntry;
};

/** The proposed-value inputs wrap instead of truncating (so a long address
 * reads in full next to the current one) but must stay single-line values. */
const singleLine = (value: string) => value.replace(/\r?\n/g, " ");

type RowState = { changed: boolean; hidden: boolean };

const changedRowSx = {
  bgcolor: (theme: { palette: { warning: { main: string } } }) =>
    alpha(theme.palette.warning.main, 0.08),
  "& > td:first-of-type": {
    boxShadow: (theme: { palette: { warning: { main: string } } }) =>
      `inset 3px 0 0 ${theme.palette.warning.main}`,
  },
};

const ChangedChip = () => (
  <Chip
    label="Changed"
    size="small"
    color="warning"
    variant="outlined"
    sx={{ ml: 1, height: 20, fontSize: "0.7rem" }}
  />
);

const FieldRow = ({
  label,
  current,
  changed,
  hidden,
  children,
}: RowState & { label: string; current: ReactNode; children: ReactNode }) => {
  if (hidden) {
    return null;
  }

  return (
    <TableRow sx={changed ? changedRowSx : undefined}>
      <TableCell sx={{ color: "text.secondary" }}>
        {label}
        {changed && <ChangedChip />}
      </TableCell>
      <TableCell sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {current}
      </TableCell>
      <TableCell sx={{ wordBreak: "break-word" }}>{children}</TableCell>
    </TableRow>
  );
};

const DetailsPanel = ({
  title,
  changed,
  hidden,
  children,
}: RowState & { title: string; children: ReactNode }) => {
  if (hidden) {
    return null;
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        ...(changed && {
          borderColor: "warning.main",
          bgcolor: (theme) => alpha(theme.palette.warning.main, 0.04),
        }),
      }}
    >
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        {title}
        {changed && <ChangedChip />}
      </Typography>
      {children}
    </Paper>
  );
};

/** Fields compared on the review page, in display order. */
const COMPARED_FIELDS = [
  "name",
  "resource_type",
  "status",
  "entry_type",
  "description",
  "guidelines",
  "address",
  "city",
  "state",
  "zip_code",
  "latitude",
  "longitude",
  "hours",
  "images",
  "details",
] as const;

type ComparedField = (typeof COMPARED_FIELDS)[number];

const DETAILS_KEY = {
  WATER: "water",
  FOOD: "food",
  FORAGE: "forage",
  BATHROOM: "bathroom",
} as const satisfies Record<ResourceType, keyof EditableValues>;

const findChangedFields = (
  resource: ResourceEntry | null,
  currentValues: EditableValues | null,
  proposal: ResourceEntry,
  proposed: EditableValues,
) => {
  const changed = new Set<ComparedField>();
  if (!resource || !currentValues) {
    return changed;
  }
  const detailsKey = DETAILS_KEY[proposed.resource_type];
  for (const field of COMPARED_FIELDS) {
    const differs =
      field === "hours"
        ? valuesDiffer(resource.hours, proposal.hours)
        : field === "images"
          ? valuesDiffer(resource.images, proposal.images)
          : field === "details"
            ? detailsKey !== undefined &&
              valuesDiffer(currentValues[detailsKey], proposed[detailsKey])
            : valuesDiffer(currentValues[field], proposed[field]);
    if (differs) {
      changed.add(field);
    }
  }
  return changed;
};

const ReviewDetail = () => {
  const { edit, resource, changeLog } = useLoaderData<{
    edit: ResourceEdit;
    resource: ResourceEntry | null;
    changeLog: ResourceChangeLogEntry[];
  }>();
  const actionData = useActionData<{ message?: string }>();
  const fetcher = useFetcher<{ message?: string; ok?: boolean }>();

  const proposal = useMemo(
    () => effectiveProposal(edit, resource),
    [edit, resource],
  );
  const savedValues = useMemo(() => toEditableValues(proposal), [proposal]);

  const [values, setValues] = useState<EditableValues>(savedValues);

  useEffect(() => {
    setValues(savedValues);
  }, [savedValues]);

  const isNew = edit.mapped_resource === null;
  const isPending = edit.review_status === "PENDING";
  const isSaving = fetcher.state !== "idle";

  const isDirty = valuesDiffer(savedValues, values);

  const currentValues = useMemo(
    () => (resource ? toEditableValues(resource) : null),
    [resource],
  );
  // Only edits to a resource we could load have something to compare to.
  const canCompare = currentValues !== null;

  const changedFields = useMemo(
    () => findChangedFields(resource, currentValues, proposal, values),
    [resource, currentValues, proposal, values],
  );
  // Rows the submitter changed stay listed even if the reviewer edits them
  // back to the current value, so a row never vanishes mid-typing.
  const submittedChanges = useMemo(
    () => findChangedFields(resource, currentValues, proposal, savedValues),
    [resource, currentValues, proposal, savedValues],
  );

  const [showChangedOnly, setShowChangedOnly] = useState(true);

  const rowState = (field: ComparedField): RowState => {
    const changed = changedFields.has(field);
    return {
      changed,
      hidden:
        canCompare &&
        showChangedOnly &&
        !changed &&
        !submittedChanges.has(field),
    };
  };

  const setField = <K extends keyof EditableValues>(
    key: K,
    value: EditableValues[K],
  ) => setValues((v) => ({ ...v, [key]: value }));

  const setWater = <K extends keyof EditableValues["water"]>(
    key: K,
    value: EditableValues["water"][K],
  ) => setValues((v) => ({ ...v, water: { ...v.water, [key]: value } }));

  const setFood = <K extends keyof EditableValues["food"]>(
    key: K,
    value: EditableValues["food"][K],
  ) => setValues((v) => ({ ...v, food: { ...v.food, [key]: value } }));

  const setForage = <K extends keyof EditableValues["forage"]>(
    key: K,
    value: EditableValues["forage"][K],
  ) => setValues((v) => ({ ...v, forage: { ...v.forage, [key]: value } }));

  const setBathroom = <K extends keyof EditableValues["bathroom"]>(
    key: K,
    value: EditableValues["bathroom"][K],
  ) => setValues((v) => ({ ...v, bathroom: { ...v.bathroom, [key]: value } }));

  const handleSave = (event: SubmitEvent<HTMLFormElement>) => {
    // The payload is a nested object (not flat form fields), so it's sent as
    // JSON via the fetcher rather than a native form-encoded submission —
    // still routed through a real <fetcher.Form> below for the submit
    // semantics (Enter-to-submit, pending state, progressive enhancement).
    event.preventDefault();

    // Send only what the reviewer changed: a NULL column means "no change"
    // to approve_edit, so a sparse edit can't freeze stale snapshot values
    // over newer data. Fields emptied on purpose go in cleared_fields.
    const before = toPayload(savedValues);
    const after = toPayload(values);
    const changes: Record<string, unknown> = {};
    const cleared = new Set(edit.cleared_fields ?? []);
    for (const key of Object.keys(after) as (keyof ResourceEntry)[]) {
      if (!valuesDiffer(before[key], after[key])) {
        continue;
      }
      changes[key] = after[key];
      if (after[key] === null) {
        cleared.add(key);
      } else {
        cleared.delete(key);
      }
    }
    const payload = { ...changes, cleared_fields: [...cleared] };

    // biome-ignore lint/suspicious/noExplicitAny: react-router's JsonValue submit-target type isn't exported to cast against
    fetcher.submit({ intent: "save", values: payload } as any, {
      method: "post",
      encType: "application/json",
    });
  };

  return (
    <Stack gap={3}>
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          mx: -4,
          px: 4,
          py: 1,
          mt: -1,
          bgcolor: "background.default",
        }}
      >
        <Typography
          component={RouterLink}
          to="/reviews"
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
          Back to review queue
        </Typography>
      </Box>
      <Box>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Review proposed edit
        </Typography>
        <Stack direction="row" gap={1} alignItems="center">
          <Chip
            label={edit.review_status}
            size="small"
            color={statusChipColor(edit.review_status)}
          />
          <Typography variant="body2" color="text.secondary">
            Submitted{" "}
            {new Date(edit.submitted_at).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            {edit.submitted_by ? ` by ${edit.submitted_by}` : ""}
          </Typography>
        </Stack>
      </Box>

      {isNew && (
        <Alert severity="info">
          This is a brand-new site submission — there is no existing resource to
          compare against.
        </Alert>
      )}

      {!isNew && !resource && (
        <Alert severity="warning">
          The resource this edit targets (#{edit.mapped_resource}) could not be
          found — it may have been deleted.
        </Alert>
      )}

      <ResourceLocationPanel
        latitude={values.latitude}
        longitude={values.longitude}
        currentLatitude={resource?.latitude}
        currentLongitude={resource?.longitude}
        gpId={edit.gp_id}
        label={values.name || undefined}
      />

      {!isNew && changeLog.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Change history
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableBody>
                {changeLog.map((entry) => (
                  <TableRow key={entry.edit_id}>
                    <TableCell>
                      <Chip
                        label={entry.review_status}
                        size="small"
                        color={statusChipColor(entry.review_status)}
                      />
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>
                      {entry.reviewed_by ?? "—"}
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>
                      {entry.reviewed_at
                        ? new Date(entry.reviewed_at).toLocaleString(
                            undefined,
                            { dateStyle: "medium", timeStyle: "short" },
                          )
                        : "—"}
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>
                      {entry.review_notes ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {canCompare && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={1}
        >
          <Typography variant="subtitle1" fontWeight={600}>
            {changedFields.size} of {COMPARED_FIELDS.length} fields changed
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={showChangedOnly}
                onChange={(e) => setShowChangedOnly(e.target.checked)}
              />
            }
            label="Show changed fields only"
          />
        </Stack>
      )}

      {canCompare && changedFields.size === 0 && (
        <Alert severity="info">
          This proposal is identical to the live resource.
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        {/* Fixed layout gives Current and Proposed equal widths, so a long
            current value can't squeeze the proposed input. */}
        <Table size="small" sx={{ tableLayout: "fixed" }}>
          <TableBody>
            <TableRow sx={{ "& th, & td": { fontWeight: 600 } }}>
              <TableCell component="th" sx={{ width: 180 }}>
                Field
              </TableCell>
              <TableCell component="th">Current</TableCell>
              <TableCell component="th">Proposed</TableCell>
            </TableRow>

            <FieldRow
              label="Name"
              current={formatValue(resource?.name)}
              {...rowState("name")}
            >
              <TextField
                size="small"
                fullWidth
                multiline
                value={values.name}
                disabled={!isPending}
                onChange={(e) => setField("name", singleLine(e.target.value))}
              />
            </FieldRow>

            <FieldRow
              label="Resource type"
              current={formatValue(resource?.resource_type)}
              {...rowState("resource_type")}
            >
              <TextField
                select
                size="small"
                fullWidth
                value={values.resource_type}
                disabled={!isPending}
                onChange={(e) =>
                  setField("resource_type", e.target.value as ResourceType)
                }
              >
                {RESOURCE_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>
            </FieldRow>

            <FieldRow
              label="Status"
              current={formatValue(resource?.status)}
              {...rowState("status")}
            >
              <TextField
                select
                size="small"
                fullWidth
                value={values.status}
                disabled={!isPending}
                onChange={(e) =>
                  setField("status", e.target.value as ResourceStatus)
                }
              >
                {RESOURCE_STATUSES.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </TextField>
            </FieldRow>

            <FieldRow
              label="Entry type"
              current={formatValue(resource?.entry_type)}
              {...rowState("entry_type")}
            >
              <TextField
                select
                size="small"
                fullWidth
                value={values.entry_type}
                disabled={!isPending}
                onChange={(e) =>
                  setField("entry_type", e.target.value as EntryType)
                }
              >
                {ENTRY_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>
            </FieldRow>

            <FieldRow
              label="Description"
              current={formatValue(resource?.description)}
              {...rowState("description")}
            >
              <TextField
                size="small"
                fullWidth
                multiline
                minRows={2}
                value={values.description}
                disabled={!isPending}
                onChange={(e) => setField("description", e.target.value)}
              />
            </FieldRow>

            <FieldRow
              label="Guidelines"
              current={formatValue(resource?.guidelines)}
              {...rowState("guidelines")}
            >
              <TextField
                size="small"
                fullWidth
                multiline
                minRows={2}
                value={values.guidelines}
                disabled={!isPending}
                onChange={(e) => setField("guidelines", e.target.value)}
              />
            </FieldRow>

            <FieldRow
              label="Address"
              current={formatValue(resource?.address)}
              {...rowState("address")}
            >
              <TextField
                size="small"
                fullWidth
                multiline
                value={values.address}
                disabled={!isPending}
                onChange={(e) =>
                  setField("address", singleLine(e.target.value))
                }
              />
            </FieldRow>

            <FieldRow
              label="City"
              current={formatValue(resource?.city)}
              {...rowState("city")}
            >
              <TextField
                size="small"
                fullWidth
                multiline
                value={values.city}
                disabled={!isPending}
                onChange={(e) => setField("city", singleLine(e.target.value))}
              />
            </FieldRow>

            <FieldRow
              label="State"
              current={formatValue(resource?.state)}
              {...rowState("state")}
            >
              <TextField
                size="small"
                fullWidth
                multiline
                value={values.state}
                disabled={!isPending}
                onChange={(e) => setField("state", singleLine(e.target.value))}
              />
            </FieldRow>

            <FieldRow
              label="Zip code"
              current={formatValue(resource?.zip_code)}
              {...rowState("zip_code")}
            >
              <TextField
                size="small"
                fullWidth
                multiline
                value={values.zip_code}
                disabled={!isPending}
                onChange={(e) =>
                  setField("zip_code", singleLine(e.target.value))
                }
              />
            </FieldRow>

            <FieldRow
              label="Latitude"
              current={formatValue(resource?.latitude)}
              {...rowState("latitude")}
            >
              <TextField
                size="small"
                fullWidth
                type="number"
                value={values.latitude}
                disabled={!isPending}
                onChange={(e) => setField("latitude", Number(e.target.value))}
              />
            </FieldRow>

            <FieldRow
              label="Longitude"
              current={formatValue(resource?.longitude)}
              {...rowState("longitude")}
            >
              <TextField
                size="small"
                fullWidth
                type="number"
                value={values.longitude}
                disabled={!isPending}
                onChange={(e) => setField("longitude", Number(e.target.value))}
              />
            </FieldRow>

            <FieldRow
              label="Hours"
              current={formatValue(resource?.hours)}
              {...rowState("hours")}
            >
              {formatValue(proposal.hours)}
            </FieldRow>

            <FieldRow
              label="Images"
              current={formatValue(resource?.images)}
              {...rowState("images")}
            >
              {formatValue(proposal.images)}
            </FieldRow>
          </TableBody>
        </Table>
      </TableContainer>

      {values.resource_type === "WATER" && (
        <DetailsPanel title="Water details" {...rowState("details")}>
          <Stack direction={{ xs: "column", md: "row" }} gap={3}>
            <Box flex={1}>
              <Typography variant="caption" color="text.secondary">
                Current
              </Typography>
              <Typography variant="body2">
                {formatValue(resource?.water)}
              </Typography>
            </Box>
            <Stack flex={1} gap={2}>
              <Autocomplete
                multiple
                size="small"
                options={DISPENSER_TYPES}
                value={values.water.dispenser_type}
                disabled={!isPending}
                onChange={(_, val) => setWater("dispenser_type", val)}
                renderInput={(params) => (
                  <TextField {...params} label="Dispenser types" />
                )}
              />
              <Autocomplete
                multiple
                size="small"
                options={WATER_TAGS}
                value={values.water.tags}
                disabled={!isPending}
                onChange={(_, val) => setWater("tags", val)}
                renderInput={(params) => <TextField {...params} label="Tags" />}
              />
            </Stack>
          </Stack>
        </DetailsPanel>
      )}

      {values.resource_type === "FOOD" && (
        <DetailsPanel title="Food details" {...rowState("details")}>
          <Stack direction={{ xs: "column", md: "row" }} gap={3}>
            <Box flex={1}>
              <Typography variant="caption" color="text.secondary">
                Current
              </Typography>
              <Typography variant="body2">
                {formatValue(resource?.food)}
              </Typography>
            </Box>
            <Stack flex={1} gap={2}>
              <Autocomplete
                multiple
                size="small"
                options={FOOD_TYPES}
                value={values.food.food_type}
                disabled={!isPending}
                onChange={(_, val) => setFood("food_type", val)}
                renderInput={(params) => (
                  <TextField {...params} label="Food types" />
                )}
              />
              <Autocomplete
                multiple
                size="small"
                options={DISTRIBUTION_TYPES}
                value={values.food.distribution_type}
                disabled={!isPending}
                onChange={(_, val) => setFood("distribution_type", val)}
                renderInput={(params) => (
                  <TextField {...params} label="Distribution types" />
                )}
              />
              <TextField
                select
                size="small"
                label="Organization type"
                value={values.food.organization_type}
                disabled={!isPending}
                onChange={(e) =>
                  setFood(
                    "organization_type",
                    e.target.value as OrganizationType,
                  )
                }
              >
                {ORGANIZATION_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                label="Organization name"
                value={values.food.organization_name}
                disabled={!isPending}
                onChange={(e) => setFood("organization_name", e.target.value)}
              />
              <TextField
                size="small"
                label="Organization URL"
                value={values.food.organization_url}
                disabled={!isPending}
                onChange={(e) => setFood("organization_url", e.target.value)}
              />
            </Stack>
          </Stack>
        </DetailsPanel>
      )}

      {values.resource_type === "FORAGE" && (
        <DetailsPanel title="Forage details" {...rowState("details")}>
          <Stack direction={{ xs: "column", md: "row" }} gap={3}>
            <Box flex={1}>
              <Typography variant="caption" color="text.secondary">
                Current
              </Typography>
              <Typography variant="body2">
                {formatValue(resource?.forage)}
              </Typography>
            </Box>
            <Stack flex={1} gap={2}>
              <Autocomplete
                multiple
                size="small"
                options={FORAGE_TYPES}
                value={values.forage.forage_type}
                disabled={!isPending}
                onChange={(_, val) => setForage("forage_type", val)}
                renderInput={(params) => (
                  <TextField {...params} label="Forage types" />
                )}
              />
              <Autocomplete
                multiple
                size="small"
                options={FORAGE_TAGS}
                value={values.forage.tags}
                disabled={!isPending}
                onChange={(_, val) => setForage("tags", val)}
                renderInput={(params) => <TextField {...params} label="Tags" />}
              />
            </Stack>
          </Stack>
        </DetailsPanel>
      )}

      {values.resource_type === "BATHROOM" && (
        <DetailsPanel title="Bathroom details" {...rowState("details")}>
          <Stack direction={{ xs: "column", md: "row" }} gap={3}>
            <Box flex={1}>
              <Typography variant="caption" color="text.secondary">
                Current
              </Typography>
              <Typography variant="body2">
                {formatValue(resource?.bathroom)}
              </Typography>
            </Box>
            <Stack flex={1} gap={2}>
              <Autocomplete
                multiple
                size="small"
                options={BATHROOM_TAGS}
                value={values.bathroom.tags}
                disabled={!isPending}
                onChange={(_, val) => setBathroom("tags", val)}
                renderInput={(params) => <TextField {...params} label="Tags" />}
              />
            </Stack>
          </Stack>
        </DetailsPanel>
      )}

      {fetcher.data?.message && (
        <Alert severity={fetcher.data.ok ? "success" : "error"}>
          {fetcher.data.message}
        </Alert>
      )}

      {actionData?.message && (
        <Alert severity="error">{actionData.message}</Alert>
      )}

      {isPending && isDirty && (
        <Alert severity="warning">
          You have unsaved changes. Approving applies the saved proposal, so
          save your changes first (or reload the page to discard them).
        </Alert>
      )}

      {isPending && (
        <Stack direction="row" gap={2}>
          <fetcher.Form method="post" onSubmit={handleSave}>
            <Button
              type="submit"
              variant="outlined"
              disabled={!isDirty}
              loading={isSaving}
              loadingPosition="start"
            >
              Save changes
            </Button>
          </fetcher.Form>

          <Form method="post">
            <Stack direction="row" gap={2}>
              <Button
                type="submit"
                name="intent"
                value="approve"
                variant="contained"
                color="success"
                disabled={isDirty}
              >
                Approve
              </Button>
              <Button
                type="submit"
                name="intent"
                value="reject"
                variant="outlined"
                color="error"
              >
                Reject
              </Button>
            </Stack>
          </Form>
        </Stack>
      )}
    </Stack>
  );
};

export default ReviewDetail;
