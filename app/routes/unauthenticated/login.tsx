import {
  type ActionFunction,
  data,
  Form,
  redirect,
  useActionData,
} from "react-router";
import { getServerClient } from "~/api/client.server";

export const loader = async () => {};

export const action: ActionFunction = async ({ request }) => {
  const { client } = getServerClient(request);

  const formData = await request.formData();
  const email = formData.get("email");
  if (typeof email !== "string" || !email) {
    return data({ email: "Invalid" });
  }
  try {
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    console.log(error);
    if (error) {
      throw data(error, { status: error.status, statusText: error.message });
    }
  } catch (error) {
    return data(error);
  }

  return redirect("../verify");
};

const Login = () => {
  const action = useActionData();
  console.log(action);
  return (
    <div>
      <h1>Login</h1>
      <Form method="post">
        <div>
          <label htmlFor="email">Email</label>
          <input name="email" />
        </div>

        <button type="submit">Login</button>
      </Form>
    </div>
  );
};

export default Login;
