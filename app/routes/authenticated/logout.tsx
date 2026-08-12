import {
  type ActionFunction,
  type LoaderFunction,
  redirect,
} from "react-router";
import { getDatabaseClient } from "~/api/client.server";

// Signing out is a mutation, so it belongs in the action (POST), not a GET
// loader. A direct GET to this route just bounces back to the dashboard.
export const loader: LoaderFunction = () => redirect("/");

export const action: ActionFunction = async ({ request }) => {
  const { client, headers } = getDatabaseClient(request);

  await client.auth.signOut();

  return redirect("/auth", { headers });
};
