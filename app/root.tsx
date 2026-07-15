import { Box } from "@mui/material";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteLoaderData,
} from "react-router";
import type { Route } from "./+types/root";
import "./app.css";
import { ThemeModeProvider } from "./theme/ThemeModeProvider";
import { getThemeMode } from "./theme/theme-cookie.server";

// The theme cookie (see theme-cookie.server.ts) lets the server render the
// right `dark` class on <html> up front, so there's no flash of the wrong
// theme and no need for a blocking inline script before hydration.
export function loader({ request }: Route.LoaderArgs) {
  return { themeMode: getThemeMode(request) };
}

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  // useRouteLoaderData (not useLoaderData) because Layout also renders the
  // ErrorBoundary path, where the root loader may not have run.
  const themeMode = useRouteLoaderData<typeof loader>("root")?.themeMode;

  return (
    <html lang="en" className={themeMode === "dark" ? "dark" : undefined}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { themeMode } = useLoaderData<typeof loader>();

  return (
    <ThemeModeProvider initialMode={themeMode}>
      <Outlet />
    </ThemeModeProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <Box
      component="main"
      sx={{ pt: 8, p: 2, maxWidth: "lg", mx: "auto", width: "100%" }}
    >
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <Box component="pre" sx={{ width: "100%", p: 2, overflowX: "auto" }}>
          <code>{stack}</code>
        </Box>
      )}
    </Box>
  );
}
