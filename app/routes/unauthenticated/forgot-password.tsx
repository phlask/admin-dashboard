import {
  Button,
  Link as MuiLink,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { applySchema } from "composable-functions";
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
import { forgotPasswordSchema } from "~/schemas/forgot-password";

export const loader: LoaderFunction = async ({ request }) => {
  const { client } = getDatabaseClient(request);

  const response = await client.auth.getUser();
  if (response.error) {
    return null;
  }

  return redirect("/");
};

const mutation = applySchema(forgotPasswordSchema)(async (values) => values);

export const action: ActionFunction = async ({ request }) => {
  const result = await performMutation({
    request,
    schema: forgotPasswordSchema,
    mutation,
  });

  if (!result.success) {
    return data(result, 400);
  }

  const { client } = getDatabaseClient(request);
  const origin = new URL(request.url).origin;

  await client.auth.resetPasswordForEmail(result.data.email, {
    redirectTo: `${origin}/auth/confirm`,
  });

  return data({ sent: true });
};

const ForgotPassword = () => {
  const action = useActionData<{ sent?: boolean }>();

  if (action?.sent) {
    return (
      <Stack gap={3}>
        <Stack gap={0.5}>
          <Typography variant="h5" fontWeight={600}>
            Check your email
          </Typography>
          <Typography variant="body2" color="text.secondary">
            If an account exists for that email, we've sent a link to reset your
            password.
          </Typography>
        </Stack>
        <MuiLink component={Link} to="/auth" variant="body2">
          Back to sign in
        </MuiLink>
      </Stack>
    );
  }

  return (
    <Stack gap={3}>
      <Stack gap={0.5}>
        <Typography variant="h5" fontWeight={600}>
          Reset your password
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Enter the email associated with your account and we'll send you a link
          to reset your password.
        </Typography>
      </Stack>

      <SchemaForm schema={forgotPasswordSchema}>
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

            <Button
              disabled={!formState.isValid}
              loading={formState.isSubmitting}
              loadingPosition="start"
              type="submit"
              variant="contained"
              size="large"
            >
              Send reset link
            </Button>

            <MuiLink
              component={Link}
              to="/auth"
              variant="body2"
              alignSelf="center"
            >
              Back to sign in
            </MuiLink>
          </Stack>
        )}
      </SchemaForm>
    </Stack>
  );
};

export default ForgotPassword;
