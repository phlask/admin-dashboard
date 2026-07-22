import { type LoaderFunction, redirect } from "react-router";
import { getDatabaseClient } from "~/api/client.server";

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return redirect("/auth/forgot-password");
  }

  const { client, headers } = getDatabaseClient(request);
  const { error } = await client.auth.exchangeCodeForSession(code);

  if (error) {
    return redirect("/auth/forgot-password");
  }

  return redirect("/auth/reset-password", { headers });
};
