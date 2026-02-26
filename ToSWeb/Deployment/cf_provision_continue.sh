#!/usr/bin/env bash
# Run this after cf_provision_https.sh times out on ACM validation.
# It waits for the cert, then creates CloudFront + Route 53 + updates Lambda CORS.
set -euo pipefail

# ==== REQUIRED ====
CERT_ARN=${CERT_ARN:?Set CERT_ARN to the certificate ARN printed by cf_provision_https.sh}
HOSTED_ZONE_ID=${HOSTED_ZONE_ID:?Set HOSTED_ZONE_ID}
DOMAIN_ROOT=${DOMAIN_ROOT:?Set DOMAIN_ROOT (e.g., termshift.com)}

# ==== OPTIONAL ====
SUBDOMAIN=${SUBDOMAIN:-}
REGION=${REGION:-us-east-1}
BUCKET=${BUCKET:-termshift-web}
FN=${FN:-tos-mvp-api}

if [[ -n "$SUBDOMAIN" ]]; then
  FQDN="${SUBDOMAIN}.${DOMAIN_ROOT}"
else
  FQDN="${DOMAIN_ROOT}"
fi

S3_WEBSITE_HOST="${BUCKET}.s3-website-${REGION}.amazonaws.com"
CF_ZONE_ID="Z2FDTNDATAQYW2"   # CloudFront's fixed hosted zone ID

echo "== Waiting for ACM cert to validate (this can take up to 30 min) =="
echo "Cert: $CERT_ARN"
aws acm wait certificate-validated --region "$REGION" --certificate-arn "$CERT_ARN"
echo "Cert validated."

echo "== Create CloudFront distribution =="
CF_CONFIG=$(cat <<JSON
{
  "CallerReference": "termshift-$(date +%s)",
  "Aliases": { "Quantity": 1, "Items": ["$FQDN"] },
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [{
      "Id": "s3-website-origin",
      "DomainName": "$S3_WEBSITE_HOST",
      "CustomOriginConfig": {
        "HTTPPort": 80,
        "HTTPSPort": 443,
        "OriginProtocolPolicy": "http-only",
        "OriginSslProtocols": { "Quantity": 1, "Items": ["TLSv1.2"] }
      }
    }]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3-website-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": { "Quantity": 2, "Items": ["GET","HEAD"] },
    "Compress": true,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": { "Forward": "none" }
    },
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000
  },
  "Comment": "Termshift Web",
  "Enabled": true,
  "ViewerCertificate": {
    "ACMCertificateArn": "$CERT_ARN",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  }
}
JSON
)

DIST_ID=$(aws cloudfront create-distribution --distribution-config "$CF_CONFIG" \
  --query 'Distribution.Id' --output text)
CF_DOMAIN=$(aws cloudfront get-distribution --id "$DIST_ID" \
  --query 'Distribution.DomainName' --output text)
echo "CloudFront: $DIST_ID  =>  $CF_DOMAIN"

echo "== Route 53 ALIAS A record -> CloudFront =="
ALIAS_BATCH=$(cat <<JSON
{"Comment":"Alias $FQDN -> $CF_DOMAIN","Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"$FQDN","Type":"A","AliasTarget":{"HostedZoneId":"$CF_ZONE_ID","DNSName":"$CF_DOMAIN","EvaluateTargetHealth":false}}}]}
JSON
)
aws route53 change-resource-record-sets \
  --hosted-zone-id "$HOSTED_ZONE_ID" \
  --change-batch "$ALIAS_BATCH" >/dev/null
echo "Route 53 ALIAS created."

echo "Waiting for CloudFront deployment (5-15 min)…"
aws cloudfront wait distribution-deployed --id "$DIST_ID"

echo "== Update Lambda CORS =="
aws lambda update-function-url-config \
  --function-name "$FN" \
  --cors "{\"AllowOrigins\":[\"https://${FQDN}\",\"http://localhost:5173\"],\"AllowMethods\":[\"GET\",\"POST\"],\"AllowHeaders\":[\"content-type\",\"authorization\"]}" >/dev/null || true
echo "CORS updated."

echo ""
echo "All done. Visit: https://${FQDN}"
echo "Distribution ID (save this): $DIST_ID"
