#!/usr/bin/env bash
set -euo pipefail

REGION=${AWS_REGION:-us-east-1}
BUCKET=${BUCKET:-tos-mvp-web-cs3704}

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
WEB_DIR="$( cd "${SCRIPT_DIR}/.." && pwd )"
DIST_DIR="${WEB_DIR}/dist"

echo "== Build =="
pushd "$WEB_DIR" >/dev/null
npm ci
npm run build
popd >/dev/null

echo "== Sync =="
aws s3 sync "$DIST_DIR/" "s3://$BUCKET/" --delete \
  --exclude index.html \
  --cache-control "public,max-age=31536000,immutable"

aws s3 cp "$DIST_DIR/index.html" "s3://$BUCKET/index.html" \
  --cache-control "no-cache"

echo "Redeployed: http://${BUCKET}.s3-website-${REGION}.amazonaws.com"
