import {
  createServerClient,
  type GetAllCookies,
  parseCookieHeader,
  type SetAllCookies,
  serializeCookieHeader,
} from "@supabase/ssr";
import { data } from "react-router";

export const getServerClient = (request: Request) => {
  const headers = new Headers();

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw data(new Error("Credentials are missing"), { status: 500 });
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

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: { getAll, setAll },
  });

  return { client: supabase, headers };
};
