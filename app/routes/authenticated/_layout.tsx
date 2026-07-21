import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";
import { Link, NavLink, Outlet } from "react-router";

import phlasklogo from "~/assets/PHLASK_v2.svg";

export const action = () => {};

const SidebarNavLink = styled(NavLink)({
  display: "block",
  borderRadius: 8,
  paddingInline: 16,
  paddingBlock: 10,
  fontSize: "0.875rem",
  fontWeight: 500,
  textDecoration: "none",
  color: "#4b5563",
  transition: "background-color 0.2s ease, color 0.2s ease",
  "&:hover": { backgroundColor: "#f3f4f6" },
  "&.active": {
    color: "#1d4ed8",
    backgroundColor: "#eff6ff",
  },
});

export default function DashboardLayout() {
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

        <Box
          component="nav"
          sx={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "space-between",
            p: 2,
            gap: 0.5,
          }}
        >
          <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
            <SidebarNavLink to="/" end>
              Dashboard
            </SidebarNavLink>
          </Box>

          <Box
            component={Link}
            to="/logout"
            sx={{
              display: "block",
              borderRadius: 2,
              px: 2,
              py: 1.25,
              fontSize: "0.875rem",
              fontWeight: 500,
              textDecoration: "none",
              color: "inherit",
              transition: "background-color 0.2s ease",
              "&:hover": { bgcolor: "#f3f4f6" },
            }}
          >
            Logout
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
