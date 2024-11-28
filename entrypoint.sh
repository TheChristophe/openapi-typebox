#!/bin/sh
cd /app || exit

mkdir -p -m 777 "${OUT_DIR}"
# pretend the output folder is local
# this required for two reasons:
# - eslint will ignore files outside the cwd,
# - changing the cwd to a folder elsewhere will likely break node_modules resolution, meaning eslint will still fail
ln -s "${OUT_DIR}" "./client"
npm run cli -- -o "./client" "$@"
