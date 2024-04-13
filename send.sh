#!/bin/bash

# Arguments
QUEUE_URL="Ethdam2024Stack-ListenerQueue42FD58C9-EaOqFIKzFE4B"
JSON_PAYLOAD="'{"key": "value"}'"

# Send the message to the SQS queue
aws sqs send-message --queue-url "$QUEUE_URL" --message-body "$JSON_PAYLOAD"

