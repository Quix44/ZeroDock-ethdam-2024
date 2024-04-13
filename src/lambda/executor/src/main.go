package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
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

type ProverEvent struct {
	SHA       string `json:"sha"`
	InputData string `json:"input_data"`
}

type ProverPayload struct {
	Event ProverEvent `json:"event"`
}

type Log struct {
	BlockHash        string      `json:"blockHash"`
	BlockNumber      *big.Int    `json:"blockNumber"`
	TransactionHash  string      `json:"transactionHash"`
	TransactionIndex uint        `json:"transactionIndex"`
	Address          string      `json:"address"`
	Topics           []string    `json:"topics"`
	LogIndex         uint        `json:"logIndex"`
	Removed          bool        `json:"removed"`
	Args             []BigIntHex `json:"args,omitempty"`
}

type BigIntHex struct {
	Type string `json:"type"`
	Hex  string `json:"hex"`
}

type MessagePayload struct {
	Index           int    `json:"index"`
	Address         string `json:"address"`
	TransactionHash string `json:"transactionHash"`
	BlockNumber     int    `json:"blockNumber"`
	Log             Log    `json:"log"`
}

func processMessage(msg events.SQSMessage) error {
	fmt.Println("Processing message", msg.Body)
	var payload MessagePayload
	err := json.Unmarshal([]byte(msg.Body), &payload)
	if err != nil {
		log.Printf("Error unmarshalling request: %v", err)
		return err
	}
	var _args []string
	for _, arg := range payload.Log.Args {
		cleanHexStr := strings.TrimPrefix(arg.Hex, "0x")
		number, err := strconv.ParseUint(cleanHexStr, 16, 64)
		strValue := strconv.FormatUint(number, 10)

		if err != nil {
			return err
		}
		_args = append(_args, strValue)
	}

	lambdaPayload := ContainerPayload{
		Args: _args,
	}

	// Execute the client container and get the result
	userAppContainer := "Ethdam2024Stack-handleUserAppFunctionB39AFC0F-4u2F2PszAd1Q"
	proverContainer := "Ethdam2024Stack-handleProverFunctionBA1DC7DA-GtSHEkBQ9wMn"

	userInvoke, err := invokeClientLambdaFunction(userAppContainer, lambdaPayload)
	if err != nil {
		return err
	}
	fmt.Println("Output ", userInvoke)

	// Trim the 0x
	cleanHexStr := strings.TrimPrefix(payload.TransactionHash, "0x")

	proverEvent := ProverEvent{
		InputData: cleanHexStr,
		SHA:       "bd01e031ba3610a4d7ef4c80214b868d8d89cf7ead2479c0960f37c7e46429b9",
	}

	proverPayload := ProverPayload{
		Event: proverEvent,
	}
	proverInvoke, err := invokeProverLambdaFunction(proverContainer, proverPayload)
	if err != nil {
		return err
	}
	fmt.Println("Prover ", proverInvoke)

	// create url from https://sepolia.basescan.org/tx/0x038f33794f4336274b699141fb3ae9fff3ffda9fe69c802a9ed14413bbd29ce2
	url := fmt.Sprintf("https://sepolia.basescan.org/tx/%s", payload.TransactionHash)

	ts := time.Now().UTC().String()
	proof := ProofEvent{
		ID:              cleanHexStr,
		TransactionHash: payload.TransactionHash,
		URL:             url,
		Chain:           "Base",
		Timestamp:       ts,
		EventName:       "Process",
		Typename:        "Event",
		PublicProof:     "123",
	}
	err = PutItem(connParams, proof)
	if err != nil {
		return err
	}
	// Store the proof, public data, vk, id, transactionHash, address, executionId, eventName

	return nil
}

func HandleRequest(ctx context.Context, sqsEvent events.SQSEvent) (bool, error) {
	fmt.Println("Processing event")
	for _, message := range sqsEvent.Records {
		err := processMessage(message)
		if err != nil {
			return false, fmt.Errorf("error processing message ID %s: %v", message.MessageId, err)
		}
	}
	return true, nil
}

func invokeProverLambdaFunction(functionName string, payload ProverPayload) (string, error) {
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

func invokeClientLambdaFunction(functionName string, payload ContainerPayload) (string, error) {
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

type ProofEvent struct {
	ID              string `dynamodbav:"id"`
	TransactionHash string `dynamodbav:"transactionHash"`
	URL             string `dynamodbav:"url"`
	PublicProof     string `dynamodbav:"publicProof"`
	EventName       string `dynamodbav:"eventName"`
	Chain           string `dynamodbav:"chain"`
	Typename        string `dynamodbav:"typename"`
	Timestamp       string `dynamodbav:"timestamp"`
}

func PutItem(connParams DynamoParams, proof ProofEvent) error {
	av, err := attributevalue.MarshalMap(proof)
	if err != nil {
		return fmt.Errorf("failed to marshal item: %w", err)
	}

	input := &dynamodb.PutItemInput{
		TableName: aws.String(tableName),
		Item:      av,
	}
	_, err = connParams.Svc.PutItem(connParams.Ctx, input)
	if err != nil {
		return fmt.Errorf("failed to put item in DynamoDB: %w", err)
	}

	return nil
}

func main() {
	lambda.Start(HandleRequest)
}
