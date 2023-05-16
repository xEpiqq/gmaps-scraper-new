#!/bin/bash

npm run sendToLambda

num_functions="$1"

for i in $(seq 0 $((num_functions - 1)));
do
  function_name="gmaps-scrape-$i"

  aws lambda create-function \
    --function-name "$function_name" \
    --runtime nodejs18.x \
    --handler index.handler \
    --memory-size 1557 \
    --timeout 600 \
    --role arn:aws:iam::758260992716:role/service-role/gmaps-scrape-1-role-6ukxrykp \
    --code S3Bucket=scavenger-chrome-aws,S3Key=function.zip

  echo "Finished creating function $function_name"
done