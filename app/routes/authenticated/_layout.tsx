import Dashboard from "@mui/icons-material/Dashboard";
import Logout from "@mui/icons-material/Logout";
import RateReview from "@mui/icons-material/RateReview";
import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";
import { Form, NavLink, Outlet } from "react-router";
import phlasklogo from "~/assets/PHLASK_v2.svg";
import { ThemeToggle } from "~/components/ThemeToggle";
import { WaveDivider } from "~/components/WaveDivider";
import { brand, navy } from "~/theme/theme";

export const action = () => {};

const SidebarNavLink = styled(NavLink)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.25),
  borderRadius: 12,
  padding: `${theme.spacing(1.25)} ${theme.spacing(2)}`,
  fontSize: "0.875rem",
  fontWeight: 500,
  textDecoration: "none",
  color: navy[600],
  transition: "color 0.2s ease, background-color 0.2s ease",
  "&:hover": { backgroundColor: brand[50] },
  "&.active": {
    color: brand[700],
    backgroundColor: brand[50],
  },
  ...theme.applyStyles("dark", {
    color: `${brand[100]}cc`,
    "&:hover": { backgroundColor: navy[800] },
    "&.active": {
      color: brand[300],
      backgroundColor: navy[800],
    },
  }),
}));

export default function DashboardLayout() {
  return (
    <Box
      sx={(theme) => ({
        display: "flex",
        height: "100vh",
        bgcolor: brand[50],
        color: navy[900],
        ...theme.applyStyles("dark", { bgcolor: navy[950], color: brand[50] }),
      })}
    >
      <Box
        component="aside"
        sx={(theme) => ({
          display: "flex",
          width: 256,
          flexDirection: "column",
          bgcolor: "#ffffff",
          ...theme.applyStyles("dark", { bgcolor: navy[900] }),
        })}
      >
        <Box
          sx={(theme) => ({
            position: "relative",
            overflow: "hidden",
            backgroundImage: `linear-gradient(to bottom right, ${brand[400]}, ${brand[600]})`,
            pt: 3,
            pb: 4.5,
            pl: 3,
            ...theme.applyStyles("dark", {
              backgroundImage: `linear-gradient(to bottom right, ${navy[600]}, ${navy[800]})`,
            }),
          })}
        >
          <Box
            sx={(theme) => ({
              display: "inline-flex",
              borderRadius: 3,
              bgcolor: "rgba(255,255,255,0.9)",
              p: 1,
              boxShadow: 1,
              ...theme.applyStyles("dark", { bgcolor: `${navy[950]}b3` }),
            })}
          >
            <img
              src={phlasklogo}
              alt="PHLASK Logo"
              style={{ height: 24, width: "auto" }}
            />
          </Box>
          <Box
            component="p"
            sx={{
              mt: 1,
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "rgba(255,255,255,0.8)",
            }}
          >
            Admin dashboard
          </Box>
          <WaveDivider
            color="currentColor"
            height={22}
            duration={22}
            sx={(theme) => ({
              bottom: 0,
              color: "#ffffff",
              ...theme.applyStyles("dark", { color: navy[900] }),
            })}
          />
        </Box>

        <Box
          component="nav"
          sx={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "space-between",
            p: 2,
          }}
        >
          <Box
            component="ul"
            sx={{ listStyle: "none", m: 0, p: 0, "& > li + li": { mt: 0.5 } }}
          >
            <li>
              <SidebarNavLink to="/" end>
                <Dashboard fontSize="small" />
                Dashboard
              </SidebarNavLink>
            </li>
            <li>
              <SidebarNavLink to="/reviews">
                <RateReview fontSize="small" />
                Reviews
              </SidebarNavLink>
            </li>
          </Box>

          <Box
            sx={(theme) => ({
              display: "flex",
              flexDirection: "column",
              gap: 1,
              borderTop: `1px solid ${brand[100]}`,
              pt: 1.5,
              ...theme.applyStyles("dark", { borderTopColor: navy[700] }),
            })}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderRadius: 3,
                px: 1.5,
                py: 0.75,
              }}
            >
              <Box
                component="span"
                sx={(theme) => ({
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  ...theme.applyStyles("dark", { color: `${brand[100]}b3` }),
                })}
              >
                Theme
              </Box>
              <ThemeToggle />
            </Box>
            <Box component={Form} method="post" action="/logout">
              <Box
                component="button"
                type="submit"
                sx={(theme) => ({
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  gap: 1.25,
                  borderRadius: 3,
                  border: "none",
                  bgcolor: "transparent",
                  px: 2,
                  py: 1.25,
                  fontSize: "0.875rem",
                  fontFamily: "inherit",
                  fontWeight: 500,
                  textAlign: "left",
                  cursor: "pointer",
                  color: navy[600],
                  transition: "background-color 0.2s ease",
                  "&:hover": { bgcolor: brand[50] },
                  ...theme.applyStyles("dark", {
                    color: `${brand[100]}cc`,
                    "&:hover": { bgcolor: navy[800] },
                  }),
                })}
              >
                <Logout fontSize="small" />
                Logout
              </Box>
            </Box>
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
