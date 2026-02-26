#!/usr/bin/env bash
set -euo pipefail

# --- config ---
REGION=${AWS_REGION:-us-east-1}
BUCKET=${BUCKET:-termshift-web}          # your unique bucket name
FN=${FN:-tos-mvp-api}                   # Lambda function name for CORS allowlist
CUSTOM_DOMAIN=${CUSTOM_DOMAIN:-termshift.com}

# robust paths no matter where you run from
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
WEB_DIR="$( cd "${SCRIPT_DIR}/.." && pwd )"    # ToSWeb/

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

echo "== Configure public website access =="
aws s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration \
  BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false

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
npm install
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
echo "Site URL (S3, pre-CloudFront): $SITE_URL"

echo "== Update Lambda Function URL CORS =="
aws lambda update-function-url-config \
  --function-name "$FN" \
  --cors "{\"AllowOrigins\":[\"$SITE_URL\",\"https://${CUSTOM_DOMAIN}\",\"http://localhost:5173\"],\"AllowMethods\":[\"GET\",\"POST\"],\"AllowHeaders\":[\"content-type\",\"authorization\"]}" >/dev/null || true
echo "CORS updated for: $SITE_URL and https://${CUSTOM_DOMAIN}"

echo ""
echo "Done. Next step: run cf_provision_https.sh to attach CloudFront + SSL to https://${CUSTOM_DOMAIN}"
