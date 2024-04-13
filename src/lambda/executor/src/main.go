package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	l "github.com/aws/aws-sdk-go-v2/service/lambda"
	"github.com/aws/aws-sdk-go-v2/service/lambda/types"
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

type ContainerPayload struct {
	Args []string `json:"args"`
}

type MessagePayload struct {
	Args []string `json:"args"`
	// We can add more here if needed
}

func processMessage(msg events.SQSMessage) error {
	var payload MessagePayload
	err := json.Unmarshal([]byte(msg.Body), &payload)
	if err != nil {
		log.Printf("Error unmarshalling request: %v", err)
		return err
	}

	// Grabs the incoming event, formulates it into the right payload struct
	// Executes the user lambda with struct payload
	lambdaPayload := ContainerPayload{
		Args: payload.Args,
	}

	// Execute the client container and get the result
	userAppContainer := "Ethdam2024Stack-handleUserAppFunctionB39AFC0F-4u2F2PszAd1Q"
	output, err := invokeLambdaFunction(userAppContainer, lambdaPayload)
	if err != nil {
		return err
	}
	fmt.Println(output)

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

func invokeLambdaFunction(functionName string, payload ContainerPayload) (string, error) {
	ctx := context.TODO()
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		log.Fatalf("Unable to load SDK config, %v", err)
	}

	// Create a Lambda client
	client := l.NewFromConfig(cfg)

	// Marshal the payload into JSON
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal payload: %w", err)
	}

	// Set up the Lambda invocation request
	result, err := client.Invoke(ctx, &l.InvokeInput{
		FunctionName:   aws.String(functionName),
		Payload:        payloadBytes,
		InvocationType: types.InvocationTypeRequestResponse,
	})
	if err != nil {
		return "", fmt.Errorf("failed to invoke lambda: %w", err)
	}

	// Convert the response payload to a string
	return string(result.Payload), nil
}

func main() {
	lambda.Start(HandleRequest)
}
