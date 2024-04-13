package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
)

var tableName = os.Getenv("TABLE_NAME")
var connParams DynamoParams

type DynamoParams struct {
	TableName string
	Svc       dynamodb.Client
	Ctx       context.Context
}

func init() {
	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		log.Fatalf("unable to load SDK config, %v", err)
	}
	if err != nil {
		fmt.Printf("error loading AWS configuration: %v\n", err)
		return
	}

	svc := dynamodb.NewFromConfig(cfg)
	connParams = DynamoParams{
		TableName: tableName,
		Svc:       *svc,
		Ctx:       context.Background(),
	}
}

func processMessage(msg events.SQSMessage) error {
	fmt.Printf("Processing message: %s\n", msg.Body)
	// Grabs the incoming event, formulates it into the right payload struct
	// Executes the user lambda with struct payload
	// Awaits the response
	// With the response output
	return nil
}

func HandleRequest(ctx context.Context, sqsEvent events.SQSEvent) (bool, error) {
	for _, message := range sqsEvent.Records {
		err := processMessage(message)
		if err != nil {
			return false, fmt.Errorf("error processing message ID %s: %v", message.MessageId, err)
		}
	}
	return true, nil
}

func main() {
	lambda.Start(HandleRequest)
}
