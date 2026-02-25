#!/usr/bin/env bash
set -euo pipefail

# ==== REQUIRED ====
HOSTED_ZONE_ID=${HOSTED_ZONE_ID:?Set HOSTED_ZONE_ID (Route53 hosted zone ID, no /hostedzone/ prefix)}
DOMAIN_ROOT=${DOMAIN_ROOT:?Set DOMAIN_ROOT (e.g., gertly.com)}

# ==== OPTIONAL ====
SUBDOMAIN=${SUBDOMAIN:-app}
REGION=${REGION:-us-east-1}             # ACM must be us-east-1 for CloudFront
BUCKET=${BUCKET:-tos-mvp-web-cs3704}    # S3 *website* bucket
FN=${FN:-tos-mvp-api}                   # Lambda function to update CORS

FQDN="${SUBDOMAIN}.${DOMAIN_ROOT}"
S3_WEBSITE_HOST="${BUCKET}.s3-website-${REGION}.amazonaws.com"
CF_ZONE_ID="Z2FDTNDATAQYW2"             # CloudFront hosted zone id

echo "== Request ACM certificate for https://${FQDN} in ${REGION} =="
CERT_ARN=$(aws acm request-certificate \
  --region "$REGION" \
  --domain-name "$FQDN" \
  --validation-method DNS \
  --query CertificateArn --output text)
echo "Cert: $CERT_ARN"

echo "== Wait for ACM to expose DNS validation record =="
RR_NAME=""; RR_TYPE=""; RR_VALUE=""
for i in {1..30}; do
  RR_TYPE=$(aws acm describe-certificate --region "$REGION" --certificate-arn "$CERT_ARN" \
    --query "Certificate.DomainValidationOptions[?DomainName==\`$FQDN\`].ResourceRecord.Type" --output text 2>/dev/null || echo "")
  if [[ "$RR_TYPE" == "CNAME" ]]; then
    RR_NAME=$(aws acm describe-certificate --region "$REGION" --certificate-arn "$CERT_ARN" \
      --query "Certificate.DomainValidationOptions[?DomainName==\`$FQDN\`].ResourceRecord.Name" --output text)
    RR_VALUE=$(aws acm describe-certificate --region "$REGION" --certificate-arn "$CERT_ARN" \
      --query "Certificate.DomainValidationOptions[?DomainName==\`$FQDN\`].ResourceRecord.Value" --output text)
    break
  fi
  sleep 5
done

if [[ "$RR_TYPE" != "CNAME" || -z "$RR_NAME" || -z "$RR_VALUE" ]]; then
  echo "ACM has not provided a CNAME yet. Try the manual commands I shared to query the record and upsert it."
  exit 1
fi

echo "== Upsert DNS validation CNAME in Route 53 =="
CHANGE_BATCH=$(cat <<JSON
{"Comment":"ACM validation for $FQDN","Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"$RR_NAME","Type":"$RR_TYPE","TTL":60,"ResourceRecords":[{"Value":"$RR_VALUE"}]}}]}
JSON
)
aws route53 change-resource-record-sets --hosted-zone-id "$HOSTED_ZONE_ID" --change-batch "$CHANGE_BATCH" >/dev/null

echo "Waiting for ACM validation…"
aws acm wait certificate-validated --region "$REGION" --certificate-arn "$CERT_ARN"

echo "== Create CloudFront distribution =="
CF_CONFIG=$(cat <<JSON
{
  "CallerReference": "tos-mvp-$(date +%s)",
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
  "Comment": "ToS MVP Web via CloudFront",
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
CF_DOMAIN=$(aws cloudfront get-distribution --id "$DIST_ID" --query 'Distribution.DomainName' --output text)
echo "CloudFront: $DIST_ID  domain: $CF_DOMAIN"

echo "== Route 53 ALIAS A record -> CloudFront =="
ALIAS_BATCH=$(cat <<JSON
{"Comment":"Alias $FQDN -> $CF_DOMAIN","Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"$FQDN","Type":"A","AliasTarget":{"HostedZoneId":"$CF_ZONE_ID","DNSName":"$CF_DOMAIN","EvaluateTargetHealth":false}}}]}
JSON
)
aws route53 change-resource-record-sets --hosted-zone-id "$HOSTED_ZONE_ID" --change-batch "$ALIAS_BATCH" >/dev/null

echo "Waiting for CloudFront deployment…"
aws cloudfront wait distribution-deployed --id "$DIST_ID"

echo "== Update Lambda Function URL CORS to allow your HTTPS origin =="
aws lambda update-function-url-config \
  --function-name "$FN" \
  --cors "{\"AllowOrigins\":[\"https://${FQDN}\"],\"AllowMethods\":[\"GET\",\"POST\"],\"AllowHeaders\":[\"content-type\",\"authorization\"]}" >/dev/null || true

echo "All set. Visit: https://${FQDN}"
