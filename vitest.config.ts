import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// Separate from vite.config.ts: the React Router plugin isn't meant to run
// under Vitest, and unit tests only need the `~/` path alias.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["app/**/*.test.ts"],
  },
});
