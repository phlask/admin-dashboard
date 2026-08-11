import { ArrowBack } from "@mui/icons-material";
import {
  Alert,
  Autocomplete,
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
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
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
import { getResourceRevisionAPI } from "~/api/resource-revisions/methods";
import { getResourceEntryAPI } from "~/api/resources/methods";
import { authMiddleware } from "~/middleware/auth";
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
  ResourceType,
  WaterTag,
} from "~/types/ResourceEntry";
import type { ResourceEdit } from "~/types/ResourceRevision";
import { statusChipColor } from "~/utils/chipColors";

export const middleware = [authMiddleware];

const RESOURCE_TYPES: ResourceType[] = ["WATER", "FOOD", "FORAGE", "BATHROOM"];
const ENTRY_TYPES: EntryType[] = ["OPEN", "RESTRICTED", "UNSURE"];
const DISPENSER_TYPES: DispenserType[] = [
  "DRINKING_FOUNTAIN",
  "BOTTLE_FILLER",
  "SINK",
  "JUG",
  "SODA_MACHINE",
  "PITCHER",
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
    organization_type: OrganizationType[];
    organization_name: string;
    organization_url: string;
  };
  forage: { forage_type: ForageType[]; tags: ForageTag[] };
  bathroom: { tags: BathroomTag[] };
};

const toEditableValues = (revision: ResourceEdit): EditableValues => ({
  name: revision.name ?? "",
  resource_type: revision.resource_type,
  entry_type: revision.entry_type ?? "",
  address: revision.address ?? "",
  city: revision.city ?? "",
  state: revision.state ?? "",
  zip_code: revision.zip_code ?? "",
  latitude: revision.latitude,
  longitude: revision.longitude,
  description: revision.description ?? "",
  guidelines: revision.guidelines ?? "",
  water: {
    dispenser_type: revision.water?.dispenser_type ?? [],
    tags: revision.water?.tags ?? [],
  },
  food: {
    food_type: revision.food?.food_type ?? [],
    distribution_type: revision.food?.distribution_type ?? [],
    organization_type: revision.food?.organization_type ?? [],
    organization_name: revision.food?.organization_name ?? "",
    organization_url: revision.food?.organization_url ?? "",
  },
  forage: {
    forage_type: revision.forage?.forage_type ?? [],
    tags: revision.forage?.tags ?? [],
  },
  bathroom: {
    tags: revision.bathroom?.tags ?? [],
  },
});

export const loader: LoaderFunction = async ({ request, params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    throw data("Not found", { status: 404 });
  }

  const { client } = getDatabaseClient(request);
  const revisionAPI = getResourceRevisionAPI(client);
  const revision = await revisionAPI.getById(id);

  let resource: ResourceEntry | null = null;
  try {
    const resourceAPI = getResourceEntryAPI(client);
    resource = await resourceAPI.getById(revision.mapped_resource);
  } catch {
    resource = null;
  }

  return { revision, resource };
};

export const action: ActionFunction = async ({ request, params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    throw data("Not found", { status: 404 });
  }

  const { client, headers } = getDatabaseClient(request);
  const revisionAPI = getResourceRevisionAPI(client);
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await request.json();

    if (body.intent !== "save") {
      return data({ message: "Unknown action" }, { status: 400 });
    }

    try {
      const updated = await revisionAPI.updateFields(id, body.values);
      return data({ message: "Changes saved.", ok: true, revision: updated });
    } catch {
      return data({ message: "Failed to save changes." }, { status: 400 });
    }
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent !== "approve" && intent !== "reject") {
    return data({ message: "Unknown action" }, { status: 400 });
  }

  await revisionAPI.updateStatus(
    id,
    intent === "approve" ? "APPROVED" : "REJECTED",
  );

  return redirect("/reviews", { headers });
};

const ReviewDetail = () => {
  const { revision, resource } = useLoaderData<{
    revision: ResourceEdit;
    resource: ResourceEntry | null;
  }>();
  const actionData = useActionData<{ message?: string }>();
  const fetcher = useFetcher<{ message?: string; ok?: boolean }>();

  const [values, setValues] = useState<EditableValues>(() =>
    toEditableValues(revision),
  );

  useEffect(() => {
    setValues(toEditableValues(revision));
  }, [revision]);

  const isPending = revision.review_status === "PENDING";
  const isSaving = fetcher.state !== "idle";

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

  const handleSave = () => {
    const payload: Partial<ResourceEdit> = {
      name: values.name || null,
      resource_type: values.resource_type,
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
              organization_name: values.food.organization_name || undefined,
              organization_url: values.food.organization_url || undefined,
            }
          : null,
      forage: values.resource_type === "FORAGE" ? values.forage : null,
      bathroom: values.resource_type === "BATHROOM" ? values.bathroom : null,
    };

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
            label={revision.review_status}
            size="small"
            color={statusChipColor(revision.review_status)}
          />
          <Typography variant="body2" color="text.secondary">
            Submitted{" "}
            {new Date(revision.date_created).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            {revision.creator ? ` by ${revision.creator}` : ""}
          </Typography>
        </Stack>
      </Box>

      {!resource && (
        <Alert severity="warning">
          The resource this revision targets (#{revision.mapped_resource}) could
          not be found — it may have been deleted.
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableBody>
            <TableRow sx={{ "& th, & td": { fontWeight: 600 } }}>
              <TableCell component="th">Field</TableCell>
              <TableCell component="th">Current</TableCell>
              <TableCell component="th">Proposed</TableCell>
            </TableRow>

            <TableRow>
              <TableCell sx={{ color: "text.secondary" }}>Name</TableCell>
              <TableCell>{formatValue(resource?.name)}</TableCell>
              <TableCell>
                <TextField
                  size="small"
                  fullWidth
                  value={values.name}
                  disabled={!isPending}
                  onChange={(e) => setField("name", e.target.value)}
                />
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell sx={{ color: "text.secondary" }}>
                Resource type
              </TableCell>
              <TableCell>{formatValue(resource?.resource_type)}</TableCell>
              <TableCell>
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
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell sx={{ color: "text.secondary" }}>Entry type</TableCell>
              <TableCell>{formatValue(resource?.entry_type)}</TableCell>
              <TableCell>
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
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell sx={{ color: "text.secondary" }}>
                Description
              </TableCell>
              <TableCell>{formatValue(resource?.description)}</TableCell>
              <TableCell>
                <TextField
                  size="small"
                  fullWidth
                  multiline
                  minRows={2}
                  value={values.description}
                  disabled={!isPending}
                  onChange={(e) => setField("description", e.target.value)}
                />
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell sx={{ color: "text.secondary" }}>Guidelines</TableCell>
              <TableCell>{formatValue(resource?.guidelines)}</TableCell>
              <TableCell>
                <TextField
                  size="small"
                  fullWidth
                  multiline
                  minRows={2}
                  value={values.guidelines}
                  disabled={!isPending}
                  onChange={(e) => setField("guidelines", e.target.value)}
                />
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell sx={{ color: "text.secondary" }}>Address</TableCell>
              <TableCell>{formatValue(resource?.address)}</TableCell>
              <TableCell>
                <TextField
                  size="small"
                  fullWidth
                  value={values.address}
                  disabled={!isPending}
                  onChange={(e) => setField("address", e.target.value)}
                />
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell sx={{ color: "text.secondary" }}>City</TableCell>
              <TableCell>{formatValue(resource?.city)}</TableCell>
              <TableCell>
                <TextField
                  size="small"
                  fullWidth
                  value={values.city}
                  disabled={!isPending}
                  onChange={(e) => setField("city", e.target.value)}
                />
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell sx={{ color: "text.secondary" }}>State</TableCell>
              <TableCell>{formatValue(resource?.state)}</TableCell>
              <TableCell>
                <TextField
                  size="small"
                  fullWidth
                  value={values.state}
                  disabled={!isPending}
                  onChange={(e) => setField("state", e.target.value)}
                />
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell sx={{ color: "text.secondary" }}>Zip code</TableCell>
              <TableCell>{formatValue(resource?.zip_code)}</TableCell>
              <TableCell>
                <TextField
                  size="small"
                  fullWidth
                  value={values.zip_code}
                  disabled={!isPending}
                  onChange={(e) => setField("zip_code", e.target.value)}
                />
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell sx={{ color: "text.secondary" }}>Latitude</TableCell>
              <TableCell>{formatValue(resource?.latitude)}</TableCell>
              <TableCell>
                <TextField
                  size="small"
                  fullWidth
                  type="number"
                  value={values.latitude}
                  disabled={!isPending}
                  onChange={(e) => setField("latitude", Number(e.target.value))}
                />
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell sx={{ color: "text.secondary" }}>Longitude</TableCell>
              <TableCell>{formatValue(resource?.longitude)}</TableCell>
              <TableCell>
                <TextField
                  size="small"
                  fullWidth
                  type="number"
                  value={values.longitude}
                  disabled={!isPending}
                  onChange={(e) =>
                    setField("longitude", Number(e.target.value))
                  }
                />
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell sx={{ color: "text.secondary" }}>Hours</TableCell>
              <TableCell>{formatValue(resource?.hours)}</TableCell>
              <TableCell>{formatValue(revision.hours)}</TableCell>
            </TableRow>

            <TableRow>
              <TableCell sx={{ color: "text.secondary" }}>Images</TableCell>
              <TableCell>{formatValue(resource?.images)}</TableCell>
              <TableCell>{formatValue(revision.images)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {values.resource_type === "WATER" && (
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Water details
          </Typography>
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
        </Paper>
      )}

      {values.resource_type === "FOOD" && (
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Food details
          </Typography>
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
              <Autocomplete
                multiple
                size="small"
                options={ORGANIZATION_TYPES}
                value={values.food.organization_type}
                disabled={!isPending}
                onChange={(_, val) => setFood("organization_type", val)}
                renderInput={(params) => (
                  <TextField {...params} label="Organization types" />
                )}
              />
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
        </Paper>
      )}

      {values.resource_type === "FORAGE" && (
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Forage details
          </Typography>
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
        </Paper>
      )}

      {values.resource_type === "BATHROOM" && (
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Bathroom details
          </Typography>
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
        </Paper>
      )}

      {fetcher.data?.message && (
        <Alert severity={fetcher.data.ok ? "success" : "error"}>
          {fetcher.data.message}
        </Alert>
      )}

      {actionData?.message && (
        <Alert severity="error">{actionData.message}</Alert>
      )}

      {isPending && (
        <Stack direction="row" gap={2}>
          <Button
            variant="outlined"
            onClick={handleSave}
            loading={isSaving}
            loadingPosition="start"
          >
            Save changes
          </Button>

          <Form method="post">
            <Stack direction="row" gap={2}>
              <Button
                type="submit"
                name="intent"
                value="approve"
                variant="contained"
                color="success"
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
