FROM node:22-alpine

WORKDIR /app

COPY ["package.json", "./"]
RUN corepack enable

COPY ["src", "src"]
COPY ["eslint.config.js", ".prettierrc", "tsconfig.build.json", "tsconfig.json", "pnpm-lock.yaml", "/entrypoint.sh", "./"]

RUN pnpm install
RUN pnpm build

RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
