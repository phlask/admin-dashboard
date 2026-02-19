import { type MiddlewareFunction, redirect } from "react-router";
import { getServerClient } from "~/api/client.server";
import { userContext } from "~/context/user";

export const authMiddleware: MiddlewareFunction = async ({
  request,
  context,
}) => {
  const { client } = getServerClient(request);

  const response = await client.auth.getUser();
  if (response.error) {
    return redirect("/auth");
  }

  context.set(userContext, response.data.user);
};
