# Enable pnpm once for all stages
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# 2. Dependencies Stage - Install ALL deps (dev + prod)
FROM base AS development-dependencies-env
COPY . /app
WORKDIR /app
# We copy only package manifests first to leverage Docker caching
COPY package.json pnpm-lock.yaml /app/
RUN pnpm install --frozen-lockfile

# 3. Production Deps Stage - Install ONLY prod deps
FROM base AS production-dependencies-env
WORKDIR /app
COPY package.json pnpm-lock.yaml /app/
# --prod ensures devDependencies are skipped
RUN pnpm install --prod --frozen-lockfile

# 4. Build Stage - Compile the source code
FROM base AS build-env
WORKDIR /app
COPY . /app/
# Copy node_modules from the development stage so we have TS/Build tools
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
RUN pnpm run build

# 5. Final Stage - The actual runner
FROM base
WORKDIR /app
COPY ./package.json ./pnpm-lock.yaml /app/
# Copy the "clean" production node_modules (no devDeps)
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
# Copy the built artifacts
COPY --from=build-env /app/build /app/build

CMD ["pnpm", "run", "start"]