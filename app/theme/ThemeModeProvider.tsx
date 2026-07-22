import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { THEME_COOKIE_NAME, type ThemeMode, theme } from "./theme";

type ThemeModeContextValue = {
  mode: ThemeMode;
  toggleMode: () => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

export function ThemeModeProvider({
  children,
  initialMode,
}: {
  children: ReactNode;
  initialMode: ThemeMode;
}) {
  const [mode, setMode] = useState<ThemeMode>(initialMode);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
    // One year, readable by the root loader on the next request so SSR
    // renders the right theme with no flash. Not httpOnly: it's a UI
    // preference, not a secret, and needs to be writable from here.
    // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API isn't supported in Safari/Firefox yet
    document.cookie = `${THEME_COOKIE_NAME}=${mode}; path=/; max-age=31536000; samesite=lax`;
  }, [mode]);

  const value = useMemo<ThemeModeContextValue>(
    () => ({
      mode,
      toggleMode: () => setMode((m) => (m === "dark" ? "light" : "dark")),
    }),
    [mode],
  );

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode(): ThemeModeContextValue {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    throw new Error("useThemeMode must be used within a ThemeModeProvider");
  }
  return ctx;
}
