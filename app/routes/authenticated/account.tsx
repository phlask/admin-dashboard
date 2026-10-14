import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef } from "react";
import {
  type ActionFunction,
  data,
  Form,
  type LoaderFunction,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import type { z } from "zod";
import { getDatabaseClient } from "~/api/client.server";
import { userContext } from "~/context/user";
import { authMiddleware } from "~/middleware/auth";
import { changePasswordSchema, profileSchema } from "~/schemas/account";

export const middleware = [authMiddleware];

type LoaderData = {
  email: string;
  fullName: string;
  createdAt: string | null;
  lastSignInAt: string | null;
};

type ActionData = {
  intent: "profile" | "password";
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const loader: LoaderFunction = ({ context }) => {
  const user = context.get(userContext);
  return {
    email: user?.email ?? "",
    fullName:
      typeof user?.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : "",
    createdAt: user?.created_at ?? null,
    lastSignInAt: user?.last_sign_in_at ?? null,
  } satisfies LoaderData;
};

const fieldErrorsFrom = (error: z.ZodError) => {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    errors[key] ??= issue.message;
  }
  return errors;
};

export const action: ActionFunction = async ({ request, context }) => {
  const formData = Object.fromEntries(await request.formData());
  const { client, headers } = getDatabaseClient(request);

  if (formData.intent === "profile") {
    const parsed = profileSchema.safeParse(formData);
    if (!parsed.success) {
      return data<ActionData>(
        {
          intent: "profile",
          ok: false,
          fieldErrors: fieldErrorsFrom(parsed.error),
        },
        { status: 400 },
      );
    }

    const { error } = await client.auth.updateUser({
      data: { full_name: parsed.data.fullName },
    });
    if (error) {
      return data<ActionData>(
        { intent: "profile", ok: false, message: error.message },
        { status: error.status ?? 400, headers },
      );
    }
    return data<ActionData>(
      { intent: "profile", ok: true, message: "Profile updated." },
      { headers },
    );
  }

  if (formData.intent === "password") {
    const parsed = changePasswordSchema.safeParse(formData);
    if (!parsed.success) {
      return data<ActionData>(
        {
          intent: "password",
          ok: false,
          fieldErrors: fieldErrorsFrom(parsed.error),
        },
        { status: 400 },
      );
    }

    const email = context.get(userContext)?.email;
    if (!email) {
      return data<ActionData>(
        { intent: "password", ok: false, message: "No email on this account." },
        { status: 400 },
      );
    }

    // Re-authenticate first: a session alone (e.g. a browser left signed in)
    // must not be enough to take over the account by changing its password.
    const reauth = await client.auth.signInWithPassword({
      email,
      password: parsed.data.currentPassword,
    });
    if (reauth.error) {
      return data<ActionData>(
        {
          intent: "password",
          ok: false,
          fieldErrors: { currentPassword: "Current password is incorrect" },
        },
        { status: 400, headers },
      );
    }

    const { error } = await client.auth.updateUser({
      password: parsed.data.password,
    });
    if (error) {
      return data<ActionData>(
        { intent: "password", ok: false, message: error.message },
        { status: error.status ?? 400, headers },
      );
    }
    return data<ActionData>(
      { intent: "password", ok: true, message: "Password changed." },
      { headers },
    );
  }

  return data<ActionData>(
    { intent: "profile", ok: false, message: "Unknown action" },
    { status: 400 },
  );
};

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

const AccountPage = () => {
  const { email, fullName, createdAt, lastSignInAt } =
    useLoaderData<LoaderData>();
  const result = useActionData<ActionData>();
  const navigation = useNavigation();
  const passwordForm = useRef<HTMLFormElement>(null);

  const submitting = navigation.formData?.get("intent");
  const profileResult = result?.intent === "profile" ? result : undefined;
  const passwordResult = result?.intent === "password" ? result : undefined;

  useEffect(() => {
    if (passwordResult?.ok) {
      passwordForm.current?.reset();
    }
  }, [passwordResult]);

  return (
    <Stack gap={3} sx={{ maxWidth: 640 }}>
      <Box>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Your account
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Signed in as <strong>{email}</strong> · member since{" "}
          {formatDate(createdAt)} · last sign-in {formatDate(lastSignInAt)}
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Profile
        </Typography>
        <Stack component={Form} method="post" gap={2}>
          <input type="hidden" name="intent" value="profile" />
          <TextField
            label="Email"
            value={email}
            disabled
            helperText="Ask a dashboard admin if this needs to change."
          />
          <TextField
            name="fullName"
            label="Display name"
            defaultValue={fullName}
            error={Boolean(profileResult?.fieldErrors?.fullName)}
            helperText={profileResult?.fieldErrors?.fullName ?? " "}
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />
          {profileResult?.message && (
            <Alert severity={profileResult.ok ? "success" : "error"}>
              {profileResult.message}
            </Alert>
          )}
          <Box>
            <Button
              type="submit"
              variant="contained"
              loading={submitting === "profile"}
            >
              Save profile
            </Button>
          </Box>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Change password
        </Typography>
        <Stack component={Form} method="post" gap={2} ref={passwordForm}>
          <input type="hidden" name="intent" value="password" />
          <input
            type="email"
            name="username"
            value={email}
            autoComplete="username"
            hidden
            readOnly
          />
          <TextField
            name="currentPassword"
            label="Current password"
            type="password"
            autoComplete="current-password"
            required
            error={Boolean(passwordResult?.fieldErrors?.currentPassword)}
            helperText={passwordResult?.fieldErrors?.currentPassword ?? " "}
          />
          <TextField
            name="password"
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            error={Boolean(passwordResult?.fieldErrors?.password)}
            helperText={
              passwordResult?.fieldErrors?.password ?? "At least 8 characters"
            }
          />
          <TextField
            name="confirmPassword"
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            required
            error={Boolean(passwordResult?.fieldErrors?.confirmPassword)}
            helperText={passwordResult?.fieldErrors?.confirmPassword ?? " "}
          />
          {passwordResult?.message && (
            <Alert severity={passwordResult.ok ? "success" : "error"}>
              {passwordResult.message}
            </Alert>
          )}
          <Box>
            <Button
              type="submit"
              variant="contained"
              loading={submitting === "password"}
            >
              Change password
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Stack>
  );
};

export default AccountPage;
