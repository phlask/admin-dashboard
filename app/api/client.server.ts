import {
  createServerClient,
  type GetAllCookies,
  parseCookieHeader,
  type SetAllCookies,
  serializeCookieHeader,
} from "@supabase/ssr";
import { data } from "react-router";
import { databaseApiKey, databaseUrl } from "~/constants/db.server";

export const getDatabaseClient = (request: Request) => {
  const headers = new Headers();

  if (!databaseUrl || !databaseApiKey) {
    const message = import.meta.env.DEV
      ? "Database credentials are missing! Make sure that `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are defined in a `.env` file"
      : "An unexpected error have happened. Please try again later.";
    throw data(new Error(message), { status: 500 });
  }

  const getAll: GetAllCookies = async () => {
    return parseCookieHeader(request.headers.get("Cookie") ?? "").map(
      (cookie) => ({ name: cookie.name, value: cookie.value ?? "" }),
    );
  };

  const setAll: SetAllCookies = (cookiesToSet) => {
    cookiesToSet.forEach(({ name, value }) => {
      headers.append("Set-Cookie", serializeCookieHeader(name, value, {}));
    });
  };

  const supabase = createServerClient(databaseUrl, databaseApiKey, {
    cookies: { getAll, setAll },
  });

  return { client: supabase, headers };
};
