import { type LoaderFunction, redirect, useLoaderData } from "react-router";
import { getServerClient } from "~/api/client.server";
import { userContext } from "~/context/user";

export const loader: LoaderFunction = async ({ request, context }) => {
  const { client } = getServerClient(request);
  const url = new URL(request.url);

  const tokenHash = url.searchParams.get("token");
  if (!tokenHash) {
    return redirect("/auth");
  }

  const { error, data } = await client.auth.verifyOtp({
    token_hash: tokenHash,
    type: "magiclink",
  });
  if (error) {
    return redirect("/auth");
  }

  if (data.session?.access_token && data.session.refresh_token) {
    client.auth.setSession({
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
    });
  }

  if (data.user) {
    context.set(userContext, data.user);
  }

  return redirect("/");
};

const VerifyOtp = () => {
  return null;
};

export default VerifyOtp;
