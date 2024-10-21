FROM node:20-alpine

WORKDIR /app

COPY [".yarn", ".yarn"]
COPY ["src", "src"]
COPY [".eslintrc.json", ".prettierrc", ".yarnrc.yml", "package.json", "tsconfig.build.json", "tsconfig.json", "yarn.lock", "/entrypoint.sh", "./"]

RUN yarn install
RUN yarn build

RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
