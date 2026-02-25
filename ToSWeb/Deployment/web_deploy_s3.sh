#!/usr/bin/env bash
set -euo pipefail

# --- config ---
REGION=${AWS_REGION:-us-east-1}
BUCKET=${BUCKET:-tos-mvp-web-cs3704}    # your unique bucket name
FN=${FN:-tos-mvp-api}                   # Lambda function name for CORS allowlist

# robust paths no matter where you run from
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
WEB_DIR="$( cd "${SCRIPT_DIR}/.." && pwd )"    # ToSWeb/
DIST_DIR="${WEB_DIR}/dist"

echo "== Ensure bucket s3://${BUCKET} in ${REGION} =="

if ! aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "Creating bucket…"
  if [[ "$REGION" == "us-east-1" ]]; then
    aws s3api create-bucket --bucket "$BUCKET" --region "$REGION"
  else
    aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
      --create-bucket-configuration LocationConstraint="$REGION"
  fi
else
  echo "Bucket exists."
fi

echo "== Configure public website access (demo) =="
# public-access-block (allow public policy)
aws s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration \
  BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false

# bucket policy (inline JSON – no file://)
POLICY=$(cat <<JSON
{
  "Version":"2012-10-17",
  "Statement":[{
    "Sid":"PublicRead",
    "Effect":"Allow",
    "Principal":"*",
    "Action":["s3:GetObject"],
    "Resource":["arn:aws:s3:::$BUCKET/*"]
  }]
}
JSON
)
aws s3api put-bucket-policy --bucket "$BUCKET" --policy "$POLICY"

# static website hosting with SPA fallback
aws s3 website "s3://$BUCKET/" --index-document index.html --error-document index.html

echo "== Build Vite app =="
pushd "$WEB_DIR" >/dev/null
npm ci
npm run build
popd >/dev/null

echo "== Upload (cache-friendly) =="
pushd "$WEB_DIR" >/dev/null

aws s3 sync "dist/" "s3://$BUCKET/" --delete \
  --exclude index.html \
  --cache-control "public,max-age=31536000,immutable"

aws s3 cp "dist/index.html" "s3://$BUCKET/index.html" \
  --cache-control "no-cache"

popd >/dev/null

SITE_URL="http://${BUCKET}.s3-website-${REGION}.amazonaws.com"
echo "Site URL: $SITE_URL"

echo "== Allow site origin to call Lambda Function URL (CORS) =="
aws lambda update-function-url-config \
  --function-name tos-mvp-api \
  --cors '{"AllowOrigins":[],"AllowMethods":[],"AllowHeaders":[]}'
  echo "Note: ensure the Function URL exists for $FN."

echo "Done. Visit: $SITE_URL"
