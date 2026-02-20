import {
  index,
  layout,
  type RouteConfig,
  route,
} from "@react-router/dev/routes";

export default [
  layout("routes/authenticated/_layout.tsx", [
    index("routes/authenticated/dashboard.tsx"),
  ]),
  route("auth", "routes/unauthenticated/_layout.tsx", [
    index("routes/unauthenticated/login.tsx"),
    route("verify", "routes/unauthenticated/verifyOtp.tsx"),
  ]),
] satisfies RouteConfig;
