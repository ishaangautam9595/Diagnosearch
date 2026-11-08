#!/usr/bin/env bash
# Loads the TEST fixtures (prisma/seed-test.ts) into the dedicated TEST database, builds the app against it, and runs Playwright.
set -euo pipefail
set -a; source .env.test; set +a
npx prisma migrate deploy
npx tsx prisma/seed-test.ts
npx next build
npx playwright test "$@"
