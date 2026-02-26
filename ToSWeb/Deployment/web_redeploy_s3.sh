#!/usr/bin/env bash
set -euo pipefail

REGION=${AWS_REGION:-us-east-1}
BUCKET=${BUCKET:-termshift-web}
CUSTOM_DOMAIN=${CUSTOM_DOMAIN:-termshift.com}

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
WEB_DIR="$( cd "${SCRIPT_DIR}/.." && pwd )"
DIST_DIR="${WEB_DIR}/dist"

echo "== Build =="
pushd "$WEB_DIR" >/dev/null
npm install
npm run build
popd >/dev/null

echo "== Sync to s3://${BUCKET} =="
aws s3 sync "$DIST_DIR/" "s3://$BUCKET/" --delete \
  --exclude index.html \
  --cache-control "public,max-age=31536000,immutable"

aws s3 cp "$DIST_DIR/index.html" "s3://$BUCKET/index.html" \
  --cache-control "no-cache"

echo "== Invalidate CloudFront cache =="
CF_DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Aliases.Items[?contains(@, '${CUSTOM_DOMAIN}')]].Id | [0]" \
  --output text 2>/dev/null || echo "")

if [[ -n "$CF_DIST_ID" && "$CF_DIST_ID" != "None" ]]; then
  aws cloudfront create-invalidation \
    --distribution-id "$CF_DIST_ID" \
    --paths "/*" >/dev/null
  echo "Cache invalidated for distribution $CF_DIST_ID"
else
  echo "No CloudFront distribution found for ${CUSTOM_DOMAIN} — skipping invalidation"
fi

echo ""
echo "Redeployed: https://${CUSTOM_DOMAIN}"
