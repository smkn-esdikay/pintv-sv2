#! /bin/bash

ENV_FILE="../.env"

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
  echo "Environment file $ENV_FILE not found!"
  exit 1
fi


echo -e "Env: \033[33m$ENV\033[0m | Env File: \033[33m$ENV_FILE\033[0m"


# Load env vars
set -a
source "$ENV_FILE"
set +a

# Set vars
BUCKET="$S3_BUCKET_NAME"
DISTRIBUTION_ID="$CLOUDFRONT_DIST_ID"
PROFILE="$AWS_PROFILE"
BUILD_DIR="../dist"

echo -e "Syncing to S3 Bucket: \033[33m$S3_BUCKET_NAME\033[0m"

# Sync files to S3
aws --profile "$PROFILE" s3 sync "$BUILD_DIR" "s3://$BUCKET" --delete || exit 1

echo -e "Invalidating CLoudFront ID: \033[33m$DISTRIBUTION_ID\033[0m"

# Invalidate CloudFront cache
aws --profile "$PROFILE" cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*" || exit 1

