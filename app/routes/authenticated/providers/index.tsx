import { Add, Delete, Edit, Launch } from "@mui/icons-material";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import {
  type ActionFunction,
  data,
  Form,
  type LoaderFunction,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { getDatabaseClient } from "~/api/client.server";
import { getProviderAPI } from "~/api/providers/methods";
import { authMiddleware } from "~/middleware/auth";
import type { Provider } from "~/types/Provider";

export const middleware = [authMiddleware];

export const loader: LoaderFunction = async ({ request }) => {
  const { client } = getDatabaseClient(request);
  const providerAPI = getProviderAPI(client);

  const [providers, resourceCounts] = await Promise.all([
    providerAPI.getList(),
    providerAPI.getResourceCounts(),
  ]);

  return { providers, resourceCounts };
};

/** Treat blank form fields as "not set" rather than empty strings. */
const optionalField = (value: FormDataEntryValue | null) => {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const action: ActionFunction = async ({ request }) => {
  const { client } = getDatabaseClient(request);
  const providerAPI = getProviderAPI(client);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    const id = Number(formData.get("id"));
    if (!Number.isInteger(id)) {
      return data({ message: "Invalid provider." }, { status: 400 });
    }

    try {
      await providerAPI.delete(id);
      return data({ message: "Provider removed.", ok: true });
    } catch {
      return data({ message: "Failed to remove provider." }, { status: 400 });
    }
  }

  if (intent !== "create" && intent !== "update") {
    return data({ message: "Unknown action" }, { status: 400 });
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return data({ message: "Name is required." }, { status: 400 });
  }

  const values = {
    name,
    logo_url: optionalField(formData.get("logo_url")),
    website_url: optionalField(formData.get("website_url")),
  };

  try {
    if (intent === "create") {
      await providerAPI.create(values);
      return data({ message: `Added ${name}.`, ok: true });
    }

    const id = Number(formData.get("id"));
    if (!Number.isInteger(id)) {
      return data({ message: "Invalid provider." }, { status: 400 });
    }

    await providerAPI.updateById(id, values);
    return data({ message: `Updated ${name}.`, ok: true });
  } catch {
    return data(
      {
        message:
          intent === "create"
            ? "Failed to add provider."
            : "Failed to update provider.",
      },
      { status: 400 },
    );
  }
};

type ActionResponse = { message: string; ok?: boolean };

const ProvidersPage = () => {
  const { providers, resourceCounts } = useLoaderData<{
    providers: Provider[];
    resourceCounts: Record<number, number>;
  }>();
  const actionData = useActionData<ActionResponse>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [editing, setEditing] = useState<Provider | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleting, setDeleting] = useState<Provider | null>(null);

  // Close the dialogs once a submission has succeeded.
  useEffect(() => {
    if (actionData?.ok) {
      setEditing(null);
      setIsCreating(false);
      setDeleting(null);
    }
  }, [actionData]);

  const isFormOpen = isCreating || editing !== null;

  return (
    <div>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Resource providers
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Organizations credited beneath a resource on the map as "Provided
            by".
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setIsCreating(true)}
        >
          Add provider
        </Button>
      </Stack>

      {actionData?.message && (
        <Alert
          severity={actionData.ok ? "success" : "error"}
          sx={{ mb: 2 }}
          data-testid="provider-alert"
        >
          {actionData.message}
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Logo</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Website</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Resources</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {providers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography color="text.secondary" sx={{ py: 3 }}>
                    No providers yet. Add one to start attributing resources.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {providers.map((provider) => (
              <TableRow key={provider.id} hover>
                <TableCell>
                  <Avatar
                    src={provider.logo_url ?? undefined}
                    alt={provider.name}
                    variant="rounded"
                    sx={{ width: 40, height: 40, bgcolor: "action.hover" }}
                  >
                    {provider.name.charAt(0).toUpperCase()}
                  </Avatar>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {provider.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  {provider.website_url ? (
                    <Link
                      href={provider.website_url}
                      target="_blank"
                      rel="noreferrer"
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.5,
                      }}
                    >
                      {new URL(provider.website_url).hostname}
                      <Launch sx={{ fontSize: 14 }} />
                    </Link>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      —
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={resourceCounts[provider.id] ?? 0}
                    color={resourceCounts[provider.id] ? "primary" : "default"}
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => setEditing(provider)}
                      aria-label={`Edit ${provider.name}`}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remove">
                    <IconButton
                      size="small"
                      onClick={() => setDeleting(provider)}
                      aria-label={`Remove ${provider.name}`}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add / edit */}
      <Dialog
        open={isFormOpen}
        onClose={() => {
          setEditing(null);
          setIsCreating(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <Form method="post">
          <DialogTitle>
            {editing ? "Edit provider" : "Add provider"}
          </DialogTitle>
          <DialogContent>
            <input
              type="hidden"
              name="intent"
              value={editing ? "update" : "create"}
            />
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField
                name="name"
                label="Name"
                required
                fullWidth
                autoFocus
                defaultValue={editing?.name ?? ""}
                placeholder="Share Food Program"
              />
              <TextField
                name="website_url"
                label="Website URL"
                type="url"
                fullWidth
                defaultValue={editing?.website_url ?? ""}
                placeholder="https://www.sharefoodprogram.org/"
              />
              <TextField
                name="logo_url"
                label="Logo URL"
                type="url"
                fullWidth
                defaultValue={editing?.logo_url ?? ""}
                placeholder="https://example.org/logo.svg"
                helperText="Shown on the map next to the resource. Falls back to the name if empty."
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              type="button"
              onClick={() => {
                setEditing(null);
                setIsCreating(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {editing ? "Save changes" : "Add provider"}
            </Button>
          </DialogActions>
        </Form>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleting !== null} onClose={() => setDeleting(null)}>
        <Form method="post">
          <DialogTitle>Remove provider?</DialogTitle>
          <DialogContent>
            <input type="hidden" name="intent" value="delete" />
            <input type="hidden" name="id" value={deleting?.id ?? ""} />
            <DialogContentText>
              {deleting?.name} will no longer be available for attribution.
            </DialogContentText>
            {deleting && (resourceCounts[deleting.id] ?? 0) > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                This provider is attributed to {resourceCounts[deleting.id]}{" "}
                resource(s). Those resources will lose their "Provided by"
                credit.
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button type="button" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              color="error"
              variant="contained"
              disabled={isSubmitting}
            >
              Remove
            </Button>
          </DialogActions>
        </Form>
      </Dialog>
    </div>
  );
};

export default ProvidersPage;
