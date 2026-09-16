#!/usr/bin/env bash
#
# Deploy this demo to Cloudflare Pages: https://ff-shoots.pages.dev
#
#   npm run deploy            # production
#   npm run deploy:preview    # preview branch, production untouched
#
# Same pattern as the other FF portfolio demos (ff-search, ff-meridian, ...): a DIRECT UPLOAD
# Pages project on Fakhrul's personal Cloudflare account, no git connection — pushing to GitHub
# deploys nothing; push and deploy are two acts. Credentials come from the FF brand repo's .env
# (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID). wrangler ≥4.13x needs --force for legacy Pages.
# Every past deployment stays live at its own <id>.ff-shoots.pages.dev.
#
# Pages caps files at 25 MiB — the films in public/videos/mux are kept under that.
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT="ff-shoots"
BRANCH="${FF_BRANCH:-main}"
ENV_FILE="${FF_ENV:-$HOME/Desktop/dev/ffdevstudio/.env}"

[ -f "$ENV_FILE" ] || { echo "✗ no credentials at $ENV_FILE"; exit 1; }
set -a; . "$ENV_FILE"; set +a
: "${CLOUDFLARE_API_TOKEN:?missing in $ENV_FILE}"
: "${CLOUDFLARE_ACCOUNT_ID:?missing in $ENV_FILE}"

big=$(find public -type f -size +25M | head -1)
[ -z "$big" ] || { echo "✗ over Pages' 25 MiB file limit: $big"; exit 1; }

npm run build   # output: "export" → out/
# Long-lived caching for the immutable media; everything else stays default.
printf '/videos/*\n  Cache-Control: public, max-age=31536000, immutable\n/images/projects/*\n  Cache-Control: public, max-age=31536000, immutable\n/fonts/*\n  Cache-Control: public, max-age=31536000, immutable\n' > out/_headers

npx --yes wrangler@latest pages project list 2>/dev/null | grep -q "│ $PROJECT " \
  || npx --yes wrangler@latest pages project create "$PROJECT" --production-branch main --force

npx --yes wrangler@latest pages deploy out --project-name "$PROJECT" --branch "$BRANCH" --commit-dirty=true --force
