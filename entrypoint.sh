#!/bin/sh
cd /app || exit

mkdir -p "${OUT_DIR}"
outDir=${OUT_DIR}
npm run cli -- -o "${OUT_DIR}" "$@"
