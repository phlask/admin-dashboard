import { Box } from "@mui/material";
import { Outlet } from "react-router";

import phlasklogo from "~/assets/PHLASK_v2.svg";

export default function UnauthenticatedLayout() {
  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        bgcolor: "#f9fafb",
        color: "#111827",
      }}
    >
      <Box
        component="aside"
        sx={{
          display: "flex",
          width: 256,
          flexDirection: "column",
          bgcolor: "#ffffff",
          borderRight: "1px solid #e5e7eb",
        }}
      >
        <Box sx={{ p: 3, borderBottom: "1px solid #f3f4f6" }}>
          <Box
            component="h1"
            sx={{
              m: 0,
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "#2563eb",
              letterSpacing: "-0.025em",
            }}
          >
            <img src={phlasklogo} alt="PHLASK Logo" />
          </Box>
        </Box>
      </Box>

      <Box component="main" sx={{ flex: 1, overflow: "auto" }}>
        <Box sx={{ p: 4 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
