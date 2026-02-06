import {
  type RouteConfig,
  index,
  // route,
  layout,
} from '@react-router/dev/routes';

export default [
  layout('routes/_layout.tsx', [
    // Path: / (The Dashboard Landing)
    index('routes/dashboard.tsx'),

    // add paths
    // route('resources', 'routes/resources.tsx'),
    // route('users', 'routes/users.tsx'),
    // route('sitesponsers', 'routes/sitesponsers.tsx'),
  ]),
] satisfies RouteConfig;
