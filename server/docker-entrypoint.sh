#!/bin/sh
set -e
# Appliquer le schéma et seed si nécessaire (SQLite)
npx prisma db push --accept-data-loss 2>/dev/null || true
npx prisma db seed 2>/dev/null || true
exec node src/index.js
