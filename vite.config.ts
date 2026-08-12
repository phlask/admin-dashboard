import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths()],
  server: {
    port: 5174,
  },
  optimizeDeps: {
    // @mui/icons-material ships ~2000+ individual ESM files; without
    // pre-bundling, Vite's dev-time loader opens them one by one on demand
    // and can exhaust file handles (EMFILE), especially inside a
    // OneDrive-synced folder where the sync engine adds extra overhead.
    include: ["@mui/icons-material"],
  },
});
