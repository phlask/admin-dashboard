import { type RouteConfig, index } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  {
    path: 'admin/SuggestedEdits',
    file: 'admin/SuggestedEdits.tsx',
  },
  {
    path: 'admin/ResourceReports',
    file: 'admin/ResourceReports.tsx',
  },
  {
    path: 'admin/ResourceChangelog',
    file: 'admin/ResourceChangelog.tsx',
  },
] satisfies RouteConfig;
