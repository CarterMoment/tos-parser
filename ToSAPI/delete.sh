FN="tos-mvp-api"
ROLE_NAME="tos-mvp-lambda-role"

# delete function url permission (ignore errors)
aws lambda remove-permission --function-name "$FN" --statement-id FunctionURLAllowPublic || true
aws lambda delete-function-url-config --function-name "$FN" || true

# delete function
aws lambda delete-function --function-name "$FN"

# detach and delete role
aws iam detach-role-policy --role-name "$ROLE_NAME" \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole || true
aws iam delete-role --role-name "$ROLE_NAME"

echo "Deleted"