import { Visibility, VisibilityOff } from "@mui/icons-material";
import {
  Alert,
  Button,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { applySchema } from "composable-functions";
import { useState } from "react";
import {
  type ActionFunction,
  data,
  type LoaderFunction,
  redirect,
  useActionData,
} from "react-router";
import { performMutation, SchemaForm } from "remix-forms";
import { getDatabaseClient } from "~/api/client.server";
import { resetPasswordSchema } from "~/schemas/reset-password";

export const loader: LoaderFunction = async ({ request }) => {
  const { client } = getDatabaseClient(request);

  const response = await client.auth.getUser();
  if (response.error) {
    return redirect("/auth/forgot-password");
  }

  return null;
};

const mutation = applySchema(resetPasswordSchema)(async (values) => values);

export const action: ActionFunction = async ({ request }) => {
  const result = await performMutation({
    request,
    schema: resetPasswordSchema,
    mutation,
  });

  if (!result.success) {
    return data(result, 400);
  }

  const { client, headers } = getDatabaseClient(request);
  const response = await client.auth.updateUser({
    password: result.data.password,
  });

  if (response.error) {
    return data(
      { message: response.error.message },
      { status: response.error.status ?? 400 },
    );
  }

  return redirect("/", { headers });
};

const ResetPassword = () => {
  const action = useActionData<{ message?: string }>();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Stack gap={3}>
      <Stack gap={0.5}>
        <Typography variant="h5" fontWeight={600}>
          Set a new password
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Choose a new password for your account.
        </Typography>
      </Stack>

      <SchemaForm schema={resetPasswordSchema}>
        {({ Field, formState, register }) => (
          <Stack gap={2.5}>
            <Field name="password">
              {({ name, errors, required }) => (
                <TextField
                  {...register(name, { required })}
                  autoComplete="new-password"
                  label="New password"
                  type={showPassword ? "text" : "password"}
                  fullWidth
                  error={Boolean(errors?.length)}
                  helperText={errors?.at(0) || " "}
                  slotProps={{
                    inputLabel: { shrink: true, required },
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={
                              showPassword ? "Hide password" : "Show password"
                            }
                            onClick={() => setShowPassword((value) => !value)}
                            edge="end"
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <VisibilityOff fontSize="small" />
                            ) : (
                              <Visibility fontSize="small" />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              )}
            </Field>

            <Field name="confirmPassword">
              {({ name, errors, required }) => (
                <TextField
                  {...register(name, { required })}
                  autoComplete="new-password"
                  label="Confirm new password"
                  type={showPassword ? "text" : "password"}
                  fullWidth
                  error={Boolean(errors?.length)}
                  helperText={errors?.at(0) || " "}
                  slotProps={{ inputLabel: { shrink: true, required } }}
                />
              )}
            </Field>

            {action?.message && (
              <Alert severity="error">{action.message}</Alert>
            )}

            <Button
              disabled={!formState.isValid}
              loading={formState.isSubmitting}
              loadingPosition="start"
              type="submit"
              variant="contained"
              size="large"
            >
              Update password
            </Button>
          </Stack>
        )}
      </SchemaForm>
    </Stack>
  );
};

export default ResetPassword;
