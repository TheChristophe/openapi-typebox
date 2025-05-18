FROM node:22-alpine AS base

# based on https://pnpm.io/docker#example-1-build-a-bundle-in-a-docker-container
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
COPY ["package.json", "pnpm-lock.yaml", "./"]
RUN corepack enable

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY ["eslint.config.js", ".prettierrc", "tsconfig.build.json", "tsconfig.json", "./"]
COPY ["src", "src"]
RUN pnpm run build

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS prod
RUN apk add --no-cache bash
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
COPY --from=build /app/package.json /app/package.json
COPY ["/entrypoint.sh", "./"]

RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
