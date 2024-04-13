#!/bin/bash
set -e

TARGET="$1" # eg for all stacks do --all

echo "Deploying...."

# PortalAPIStack --e (if needed for single stack else --all) --require-approval never
cdk deploy --region us-east-1 $TARGET --e

echo "Deployment Complete"