import { type ActionFunction, redirect } from "react-router";
import { getServerClient } from "~/api/client.server";

export const action: ActionFunction = async ({ request }) => {
  const { client } = getServerClient(request);

  const formData = await request.formData();
  const email = formData.get("email");
  if (typeof email !== "string") {
    throw { email: "Invalid" };
  }
  const { error } = await client.auth.signInWithOtp({ email });
  if (error) {
    throw error;
  }

  return redirect("/");
};

const VerifyOtp = () => {
  return (
    <div>
      <h1>Verify OTP</h1>
      <form>
        <div>
          <label htmlFor="email">Verify the login code that we sent you</label>
          <input name="email" />
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default VerifyOtp;
