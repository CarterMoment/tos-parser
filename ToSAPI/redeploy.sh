#!/usr/bin/env bash
set -euo pipefail
FN=${FN:-tos-mvp-api}

./makezip.sh
aws lambda update-function-code --function-name "$FN" --zip-file fileb://function.zip >/dev/null

# small wait so the next curl doesn't race
for i in {1..20}; do
  state=$(aws lambda get-function-configuration --function-name "$FN" --query 'LastUpdateStatus' --output text 2>/dev/null || echo "")
  [[ "$state" == "Successful" ]] && break
  sleep 2
done

FUNC_URL=$(aws lambda get-function-url-config --function-name "$FN" --query 'FunctionUrl' --output text)
echo "Deployed. URL: $FUNC_URL"
