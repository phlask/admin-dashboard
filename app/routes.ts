import {
  type RouteConfig,
  index,
  route,
  layout,
} from "@react-router/dev/routes";

export default [
  // AKNOTES: THE MASTER LAYOUT
  // Everything inside here shares the Sidebar/Header
  layout("routes/layout.tsx", [
    // Path: / (The Dashboard Landing)
    index("routes/dashboard.tsx"),

    route("resources", "routes/resources.tsx"),

    // Path: /users
    route("users", "routes/users.tsx"),
  ]),
] satisfies RouteConfig;
