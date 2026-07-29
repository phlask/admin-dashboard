#!/bin/bash
set -euo pipefail

rm -rf .amplify-hosting

mkdir -p .amplify-hosting/compute/default/build
mkdir -p .amplify-hosting/static

# Server entry point and server-side build
cp server.js .amplify-hosting/compute/default/index.js
cp package.json .amplify-hosting/compute/default/package.json
cp pnpm-lock.yaml .amplify-hosting/compute/default/pnpm-lock.yaml
cp pnpm-workspace.yaml .amplify-hosting/compute/default/pnpm-workspace.yaml
cp -r build/server .amplify-hosting/compute/default/build/server

# Copy env vars baked in by the Amplify build phase so the runtime
# process can load them via process.loadEnvFile (see server.js)
if [ -f .env ]; then
  cp .env .amplify-hosting/compute/default/.env
fi

# Install production dependencies directly in the compute bundle so pnpm
# creates a self-contained node_modules/.pnpm virtual store there.
# Copying pnpm's node_modules from the build root is not safe because its
# symlinks target the global content-addressable store which won't exist
# in the Lambda runtime.
cd .amplify-hosting/compute/default
pnpm install --prod --frozen-lockfile
cd -

# Static client assets served by CloudFront/S3 via the deployment manifest
cp -r build/client/. .amplify-hosting/static/

# Amplify deployment manifest
cp deploy-manifest.json .amplify-hosting/deploy-manifest.json
