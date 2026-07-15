import { THEME_COOKIE_NAME, type ThemeMode } from "./theme";

// Plain, unsigned cookie: it only ever holds "light" | "dark", so there's
// nothing here worth signing/encoding, and keeping it plain lets the client
// write it with a bare `document.cookie =` assignment (see ThemeModeProvider).
export function getThemeMode(request: Request): ThemeMode {
  const cookieHeader = request.headers.get("Cookie") ?? "";
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${THEME_COOKIE_NAME}=(dark|light)`),
  );
  return match?.[1] === "dark" ? "dark" : "light";
}
