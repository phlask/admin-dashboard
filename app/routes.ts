import {
  index,
  layout,
  type RouteConfig,
  route,
} from "@react-router/dev/routes";

export default [
  layout("routes/authenticated/_layout.tsx", [
    index("routes/authenticated/dashboard.tsx"),
    route("logout", "routes/authenticated/logout.tsx"),
  ]),
  route("auth", "routes/unauthenticated/_layout.tsx", [
    index("routes/unauthenticated/login.tsx"),
  ]),
] satisfies RouteConfig;
