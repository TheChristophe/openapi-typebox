#!/bin/sh
cd /app || exit

mkdir -p "$OUT_DIR"
outDir=$OUT_DIR
ln -s "${outDir}" /app/client
npm run cli -- -o /app/client "$@"
chmod -R a+X "${outDir}"
chmod -R a+w "${outDir}"
#chmod -R a+W "${outDir}"
#rm /app/client
