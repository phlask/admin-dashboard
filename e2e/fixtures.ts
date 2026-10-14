import { test as base, expect } from "@playwright/test";

export const MOCK_URL = "http://127.0.0.1:54400";

type LoggedRequest = {
  method: string;
  path: string;
  query: string;
  body: Record<string, unknown> | null;
};

/** The @supabase/ssr session cookie for a signed-in reviewer. The project
 * ref is the first label of the Supabase host, "127" for 127.0.0.1. */
const sessionCookie = () => {
  const session = {
    access_token: "mock-access-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "mock-refresh",
    user: {
      id: "11111111-1111-1111-1111-111111111111",
      email: "reviewer@phlask.org",
      aud: "authenticated",
      role: "authenticated",
    },
  };
  return {
    name: "sb-127-auth-token",
    value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`,
    domain: "localhost",
    path: "/",
  };
};

export const test = base.extend<{
  signedIn: undefined;
  mockRequests: (path?: string) => Promise<LoggedRequest[]>;
}>({
  // Fresh mock data for every test.
  page: async ({ page, request }, use) => {
    await request.post(`${MOCK_URL}/__reset`);
    await use(page);
  },
  signedIn: async ({ context }, use) => {
    await context.addCookies([sessionCookie()]);
    await use(undefined);
  },
  mockRequests: async ({ request }, use) => {
    await use(async (path) => {
      const log = (await (
        await request.get(`${MOCK_URL}/__log`)
      ).json()) as LoggedRequest[];
      return path ? log.filter((entry) => entry.path === path) : log;
    });
  },
});

export { expect };
