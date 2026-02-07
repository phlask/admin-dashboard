import { index, layout, type RouteConfig } from "@react-router/dev/routes";

export default [
  layout("routes/_layout.tsx", [index("routes/dashboard.tsx")]),
] satisfies RouteConfig;
