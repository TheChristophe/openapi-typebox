#!/usr/bin/env bash
cd /app || exit

#set -u
#: "OUT_DIR"

if [[ -z "$OUT_DIR" ]]; then
    echo "OUT_DIR not set" 1>&2
    exit 1
fi

mkdir -p -m 777 "${OUT_DIR}"
# pretend the output folder is local
# this required for two reasons:
# - eslint will ignore files outside the cwd,
# - changing the cwd to a folder elsewhere will likely break node_modules resolution, meaning eslint will still fail
if [[ ! -d "./client" ]]; then
    ln -s "${OUT_DIR}" "./client"
fi
npm run cli -- -o "./client" "$@"
