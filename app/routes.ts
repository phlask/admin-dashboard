import {
  type RouteConfig,
  index,
  route,
  layout,
} from '@react-router/dev/routes';

export default [
  // Everything inside here shares the Sidebar and header from layout.tsx
  layout('routes/_layout.tsx', [
    // Path: / (The Dashboard Landing)
    index('routes/dashboard.tsx'),

    // // path: /resources and /users
    // route('resources', 'routes/resources.tsx'),
    // route('users', 'routes/users.tsx'),
    // route('sitesponsers', 'routes/sitesponsers.tsx'),
  ]),
] satisfies RouteConfig;
