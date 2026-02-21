import { type LoaderFunction, redirect } from "react-router";
import { getDatabaseClient } from "~/api/client.server";

export const loader: LoaderFunction = async ({ request }) => {
  const { client } = getDatabaseClient(request);

  await client.auth.signOut();

  return redirect("/auth");
};
