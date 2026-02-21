import { Button, Stack, TextField, Typography } from "@mui/material";
import { applySchema } from "composable-functions";
import {
  type ActionFunction,
  data,
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

export const action: ActionFunction = async ({ context, request, params }) => {
  const result = await performMutation({
    request,
    schema: loginSchema,
    mutation,
    context: { request, context, params },
  });

  if (!result.success) {
    return data(result, 400);
  }

  const { client, headers } = getDatabaseClient(request);
  const response = await client.auth.signInWithPassword(result.data);

  if (response.error) {
    return data(response.error, { status: response.error.status });
  }

  context.set(userContext, response.data.user);

  return redirect("/", { headers });
};

const Login = () => {
  const action = useActionData<{ message: string; status: number }>();

  return (
    <Stack gap={4}>
      <Typography variant="h2">Login</Typography>
      <SchemaForm schema={loginSchema}>
        {({ Field, formState, register }) => (
          <Stack gap={3} maxWidth={400}>
            <Field name="email">
              {({ name, errors, required }) => {
                return (
                  <TextField
                    {...register(name, { required })}
                    autoComplete="username"
                    label="Email"
                    fullWidth
                    slotProps={{ inputLabel: { shrink: true, required } }}
                    error={Boolean(errors?.length)}
                    helperText={errors?.at(0) || " "}
                    sx={{ maxWidth: 400 }}
                  />
                );
              }}
            </Field>
            <Field name="password">
              {({ name, errors, required }) => (
                <TextField
                  {...register(name, { required })}
                  autoComplete="current-password"
                  label="Password"
                  type="password"
                  fullWidth
                  error={Boolean(errors?.length)}
                  helperText={errors?.at(0) || " "}
                  slotProps={{ inputLabel: { shrink: true, required } }}
                  sx={{ maxWidth: 400 }}
                />
              )}
            </Field>
            <Typography
              variant="caption"
              color={action?.status === 200 ? "success" : "error"}
            >
              {action?.message}
            </Typography>

            <Button
              disabled={!formState.isValid}
              loading={formState.isSubmitting}
              loadingPosition="start"
              type="submit"
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
