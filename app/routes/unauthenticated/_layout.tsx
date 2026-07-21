import { Box } from "@mui/material";
import { Outlet } from "react-router";

import phlasklogo from "~/assets/PHLASK_v2.svg";
import { ThemeToggle } from "~/components/ThemeToggle";
import { WaveDivider } from "~/components/WaveDivider";
import { brand, navy } from "~/theme/theme";

const BUBBLES = [
  { left: "8%", size: 14, delay: 0, duration: 9 },
  { left: "18%", size: 8, delay: 2.5, duration: 7 },
  { left: "32%", size: 20, delay: 1, duration: 11 },
  { left: "62%", size: 10, delay: 3.5, duration: 8 },
  { left: "78%", size: 16, delay: 0.5, duration: 10 },
  { left: "90%", size: 9, delay: 2, duration: 7.5 },
];

export default function UnauthenticatedLayout() {
  return (
    <Box
      sx={(theme) => ({
        position: "relative",
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        px: 2,
        py: 6,
        backgroundImage: `linear-gradient(to bottom, ${brand[100]}, ${brand[300]}, ${brand[600]})`,
        ...theme.applyStyles("dark", {
          backgroundImage: `linear-gradient(to bottom, ${navy[950]}, ${navy[900]}, ${navy[800]})`,
        }),
      })}
    >
      <Box sx={{ position: "absolute", top: 16, right: 16, zIndex: 20 }}>
        <ThemeToggle />
      </Box>

      {BUBBLES.map((bubble) => (
        <Box
          key={bubble.left}
          aria-hidden
          sx={(theme) => ({
            pointerEvents: "none",
            position: "absolute",
            bottom: 0,
            borderRadius: "9999px",
            bgcolor: "rgba(255,255,255,0.4)",
            ...theme.applyStyles("dark", {
              bgcolor: `${brand[200]}33`,
            }),
          })}
          style={{
            left: bubble.left,
            width: bubble.size,
            height: bubble.size,
            animation: `bubble-rise ${bubble.duration}s ease-in infinite`,
            animationDelay: `${bubble.delay}s`,
          }}
        />
      ))}

      <WaveDivider
        color={brand[400]}
        height={140}
        opacity={0.35}
        duration={26}
        sx={(theme) => ({
          bottom: 0,
          ...theme.applyStyles("dark", { opacity: 0.2 }),
        })}
      />
      <WaveDivider
        color={brand[500]}
        height={100}
        opacity={0.45}
        duration={20}
        reverse
        sx={(theme) => ({
          bottom: 0,
          ...theme.applyStyles("dark", { opacity: 0.25 }),
        })}
      />
      <WaveDivider
        color={brand[700]}
        height={60}
        opacity={0.55}
        duration={15}
        sx={(theme) => ({
          bottom: 0,
          ...theme.applyStyles("dark", { opacity: 0.3 }),
        })}
      />

      <Box
        sx={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 448 }}
      >
        <Box sx={{ mb: 4, display: "flex", justifyContent: "center" }}>
          <Box
            sx={(theme) => ({
              display: "inline-flex",
              borderRadius: 4,
              bgcolor: "rgba(255,255,255,0.8)",
              p: 1.5,
              boxShadow: 2,
              backdropFilter: "blur(4px)",
              ...theme.applyStyles("dark", { bgcolor: `${navy[950]}99` }),
            })}
          >
            <img src={phlasklogo} alt="PHLASK Logo" style={{ height: 36 }} />
          </Box>
        </Box>
        <Box
          sx={(theme) => ({
            borderRadius: 4,
            border: "1px solid rgba(255,255,255,0.5)",
            bgcolor: "rgba(255,255,255,0.75)",
            p: 4,
            boxShadow: 8,
            backdropFilter: "blur(8px)",
            ...theme.applyStyles("dark", {
              borderColor: `${navy[700]}99`,
              bgcolor: `${navy[900]}bf`,
            }),
          })}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
