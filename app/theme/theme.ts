import { createTheme, type Theme } from "@mui/material/styles";

// Mirrors the brand-* / navy-* tokens in app/app.css (kept in sync manually —
// Tailwind's @theme values aren't importable into JS).
export const brand = {
  50: "#eafaff",
  100: "#d6f4ff",
  200: "#ade8ff",
  300: "#6fd6ff",
  400: "#38c1ff",
  500: "#10b6ff",
  600: "#0090de",
  700: "#0072b3",
  800: "#045c90",
  900: "#0a3a5c",
};

export const navy = {
  950: "#071522",
  900: "#0a1929",
  800: "#10263a",
  700: "#17344c",
  600: "#1f4560",
};

const teal = {
  300: "#5eead4",
  400: "#2dd4bf",
  500: "#14b8a6",
  600: "#0d9488",
  700: "#0f766e",
};

const fontFamily = [
  "Inter",
  "ui-sans-serif",
  "system-ui",
  "sans-serif",
  "Apple Color Emoji",
  "Segoe UI Emoji",
  "Segoe UI Symbol",
  "Noto Color Emoji",
].join(",");

const shape = { borderRadius: 14 };

const typography = {
  fontFamily,
  h4: { fontWeight: 700 },
  h5: { fontWeight: 700 },
  subtitle1: { fontWeight: 600 },
  button: { fontWeight: 600, textTransform: "none" as const },
};

// Uses MUI's CSS-variables theming keyed off the same `.dark` class Tailwind
// toggles on <html> (see ThemeModeProvider). Both light and dark rules are
// always present in the generated stylesheet — switching mode is a pure CSS
// selector match, not a JS-driven theme swap — so SSR and the first client
// render can never disagree about which theme object is "active" the way two
// separate light/dark Theme objects picked by JS state could.
export const theme: Theme = createTheme({
  cssVariables: { colorSchemeSelector: "class" },
  shape,
  typography,
  colorSchemes: {
    light: {
      palette: {
        primary: { main: brand[500], light: brand[300], dark: brand[700] },
        secondary: { main: teal[600], light: teal[400], dark: teal[700] },
        background: { default: brand[50], paper: "#ffffff" },
        divider: brand[100],
        text: { primary: navy[900], secondary: "#3d5a70" },
      },
    },
    dark: {
      palette: {
        primary: { main: brand[400], light: brand[200], dark: brand[600] },
        secondary: { main: teal[400], light: teal[300], dark: teal[600] },
        background: { default: navy[950], paper: navy[900] },
        divider: navy[700],
        text: { primary: brand[50], secondary: "#9fc2d6" },
      },
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
        outlined: ({ theme }) => ({
          borderColor: brand[100],
          boxShadow:
            "0 1px 2px rgba(10,58,92,0.06), 0 8px 20px -10px rgba(10,58,92,0.25)",
          ...theme.applyStyles("dark", {
            borderColor: navy[700],
            boxShadow: "none",
          }),
        }),
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 999, paddingInline: 20 },
        contained: ({ theme }) => ({
          boxShadow: `0 6px 16px -4px ${brand[500]}66`,
          "&:hover": { boxShadow: `0 8px 20px -4px ${brand[500]}88` },
          ...theme.applyStyles("dark", {
            boxShadow: "0 6px 18px -4px #00000080",
            "&:hover": { boxShadow: "0 8px 22px -4px #000000a0" },
          }),
        }),
      },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    MuiTableHead: {
      styleOverrides: {
        root: ({ theme }) => ({
          "& .MuiTableCell-root": {
            backgroundColor: brand[50],
            ...theme.applyStyles("dark", { backgroundColor: navy[800] }),
          },
        }),
      },
    },
    MuiTextField: {
      defaultProps: { variant: "outlined" },
    },
    MuiOutlinedInput: {
      styleOverrides: { root: { borderRadius: 10 } },
    },
  },
});

export type ThemeMode = "light" | "dark";

export const THEME_COOKIE_NAME = "phlask-theme-mode";
