import { Button, Stack, TextField, Typography } from "@mui/material";
import {
  type ActionFunction,
  data,
  Form,
  useActionData,
  useFetcher,
} from "react-router";
import { getServerClient } from "~/api/client.server";

export const action: ActionFunction = async ({ request }) => {
  const { client } = getServerClient(request);

  const formData = await request.formData();
  const email = formData.get("email");
  if (typeof email !== "string" || !email) {
    return data({ message: "Email is invalid" });
  }

  const response = await client.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: "http://localhost:5174/auth/verify",
    },
  });

  if (response.error) {
    return { status: response.error.status, message: response.error.message };
  }

  return {
    status: 200,
    message: "Follow instructions in your email to complete sign-in",
  };
};

const Login = () => {
  const action = useActionData<{ message: string; status: number }>();
  const fetcher = useFetcher();
  return (
    <Stack gap={4}>
      <Typography variant="h2">Login</Typography>
      <Form method="post">
        <Stack gap={1}>
          <TextField
            name="email"
            label="Email"
            slotProps={{ inputLabel: { shrink: true } }}
            required
            sx={{ maxWidth: 400 }}
          />
          <Button type="submit">
            {fetcher.state === "submitting" ? "Submitting..." : "Login"}
          </Button>
          <Typography
            variant="caption"
            color={action?.status === 200 ? "success" : "error"}
          >
            {action?.message}
          </Typography>
        </Stack>
      </Form>
    </Stack>
  );
};

export default Login;
