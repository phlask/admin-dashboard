import { DarkMode, LightMode } from "@mui/icons-material";
import { IconButton, Tooltip } from "@mui/material";
import { useThemeMode } from "~/theme/ThemeModeProvider";
import { brand, navy } from "~/theme/theme";

// Styling and icon visibility are driven purely by the `.dark` class (via
// theme.applyStyles / Tailwind's dark: variant) rather than the `mode` value
// from React state, so this can never mismatch between SSR and hydration.
export function ThemeToggle() {
  const { toggleMode } = useThemeMode();

  return (
    <Tooltip title="Toggle dark mode">
      <IconButton
        onClick={toggleMode}
        aria-label="Toggle dark mode"
        sx={(theme) => ({
          bgcolor: brand[100],
          color: brand[700],
          transition: "transform 0.35s ease, background-color 0.2s ease",
          "&:hover": { bgcolor: brand[200], transform: "rotate(-14deg)" },
          ...theme.applyStyles("dark", {
            bgcolor: navy[800],
            color: brand[300],
            "&:hover": { bgcolor: navy[700] },
          }),
        })}
      >
        <LightMode fontSize="small" className="dark:hidden" />
        <DarkMode fontSize="small" className="hidden dark:inline-block" />
      </IconButton>
    </Tooltip>
  );
}
