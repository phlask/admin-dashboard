import { Visibility, VisibilityOff } from "@mui/icons-material";
import {
  Alert,
  Button,
  IconButton,
  InputAdornment,
  Link as MuiLink,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { applySchema } from "composable-functions";
import { useState } from "react";
import {
  type ActionFunction,
  data,
  Link,
  type LoaderFunction,
  redirect,
  useActionData,
} from "react-router";
import { performMutation, SchemaForm } from "remix-forms";
import { getDatabaseClient } from "~/api/client.server";
import { userContext } from "~/context/user";
import { loginSchema } from "~/schemas/login";

export const loader: LoaderFunction = async ({ request }) => {
  const { client } = getDatabaseClient(request);

  const response = await client.auth.getUser();
  if (response.error) {
    return null;
  }

  return redirect("/");
};

const mutation = applySchema(loginSchema)(async (values) => values);

export const action: ActionFunction = async ({ context, request }) => {
  const result = await performMutation({
    request,
    schema: loginSchema,
    mutation,
  });

  if (!result.success) {
    return data(result, 400);
  }

  const { client, headers } = getDatabaseClient(request);
  const response = await client.auth.signInWithPassword(result.data);

  if (response.error) {
    return data(
      { message: response.error.message },
      { status: response.error.status ?? 400 },
    );
  }

  context.set(userContext, response.data.user);

  return redirect("/", { headers });
};

const Login = () => {
  const action = useActionData<{ message?: string }>();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Stack gap={3}>
      <Stack gap={0.5}>
        <Typography variant="h5" fontWeight={600}>
          Sign in
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Enter your credentials to access the PHLask admin dashboard.
        </Typography>
      </Stack>

      <SchemaForm schema={loginSchema}>
        {({ Field, formState, register }) => (
          <Stack gap={2.5}>
            <Field name="email">
              {({ name, errors, required }) => (
                <TextField
                  {...register(name, { required })}
                  autoComplete="username"
                  label="Email"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true, required } }}
                  error={Boolean(errors?.length)}
                  helperText={errors?.at(0) || " "}
                />
              )}
            </Field>

            <Stack gap={0.5}>
              <Field name="password">
                {({ name, errors, required }) => (
                  <TextField
                    {...register(name, { required })}
                    autoComplete="current-password"
                    label="Password"
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

              <MuiLink
                component={Link}
                to="/auth/forgot-password"
                variant="body2"
                alignSelf="flex-end"
              >
                Forgot password?
              </MuiLink>
            </Stack>

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
              Sign in
            </Button>
          </Stack>
        )}
      </SchemaForm>
    </Stack>
  );
};

export default Login;
