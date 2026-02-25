#!/usr/bin/env bash
set -euo pipefail

REGION=${AWS_REGION:-us-east-1}
FN=${FN:-tos-mvp-api}
ROLE_NAME=${ROLE_NAME:-tos-mvp-lambda-role}

# Require your API key in the shell (do this once per terminal: export OPENAI_API_KEY=sk-...)
: "${OPENAI_API_KEY:?Set OPENAI_API_KEY (export OPENAI_API_KEY=sk-...)}"
MODEL_ID=${MODEL_ID:-gpt-4o-mini}

wait_until_ready() {
  # Wait until State=Active and LastUpdateStatus=Successful (or fail fast on Failed)
  echo "== waiting for Lambda to be ready =="
  for i in {1..40}; do
    # two calls to avoid jq; keep it portable
    state=$(aws lambda get-function-configuration --function-name "$FN" --query 'State' --output text 2>/dev/null || echo "Unknown")
    last=$(aws lambda get-function-configuration --function-name "$FN" --query 'LastUpdateStatus' --output text 2>/dev/null || echo "Unknown")
    echo "  [$i] State=$state  LastUpdateStatus=$last"
    if [[ "$last" == "Failed" ]]; then
      echo "Lambda update FAILED. Check logs: aws logs tail /aws/lambda/$FN --since 15m --follow" >&2
      exit 1
    fi
    if [[ "$state" == "Active" && "$last" == "Successful" ]]; then
      break
    fi
    sleep 3
  done
}

retry_update_config() {
  # Retries update-function-configuration to dodge ResourceConflictException
  for i in {1..10}; do
    if aws lambda update-function-configuration \
         --function-name "$FN" \
         --timeout 20 \
         --environment "Variables={OPENAI_API_KEY=$OPENAI_API_KEY,MODEL_ID=$MODEL_ID,API_TOKEN=$API_TOKEN}" >/dev/null; then
      wait_until_ready
      return 0
    fi
    echo "  update-function-configuration attempt $i failed; retrying in 3s..."
    sleep 3
  done
  echo "update-function-configuration kept failing." >&2
  exit 1
}

echo "== build =="
./makezip.sh

echo "== ensure role =="
if ! aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document file://trust.json
  aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  sleep 8
fi
ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)

echo "== create or update function =="
if aws lambda get-function --function-name "$FN" >/dev/null 2>&1; then
  aws lambda update-function-code --function-name "$FN" --zip-file fileb://function.zip >/dev/null
else
  aws lambda create-function \
    --function-name "$FN" \
    --runtime python3.11 \
    --role "$ROLE_ARN" \
    --handler app.main.handler \
    --zip-file fileb://function.zip \
    --timeout 20 \
    --memory-size 256 >/dev/null
fi
wait_until_ready

echo "== set environment variables =="
retry_update_config

echo "== ensure function url =="
if ! aws lambda get-function-url-config --function-name "$FN" >/dev/null 2>&1; then
  aws lambda create-function-url-config --function-name "$FN" --auth-type NONE >/dev/null
  # permission may already exist; ignore error
  aws lambda add-permission \
    --function-name "$FN" \
    --statement-id FunctionURLAllowPublic \
    --action lambda:InvokeFunctionUrl \
    --principal "*" \
    --function-url-auth-type NONE >/dev/null || true
fi

FUNC_URL=$(aws lambda get-function-url-config --function-name "$FN" --query 'FunctionUrl' --output text)
echo "Function URL: $FUNC_URL"
echo "Try: curl -s ${FUNC_URL}health"
