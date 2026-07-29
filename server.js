import { createRequestHandler } from "@react-router/express";
import express from "express";

// Load env vars written by the Amplify build phase. Silently skipped
// in environments where the file doesn't exist (e.g. local dev with
// vars already in the shell).
try {
  process.loadEnvFile(".env");
} catch {
  // no-op
}

const app = express();

app.disable("x-powered-by");

app.all(
  "*splat",
  createRequestHandler({ build: () => import("./build/server/index.js") }),
);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
