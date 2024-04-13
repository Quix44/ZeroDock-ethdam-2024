package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/expression"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	l "github.com/aws/aws-sdk-go-v2/service/lambda"
	lt "github.com/aws/aws-sdk-go-v2/service/lambda/types"
)

type Event struct {
	ID                   string    `json:"id"`
	Chain                string    `json:"chain"`
	EventName            string    `json:"eventName"`
	Proof                string    `json:"proof"`
	ProofTransactionHash string    `json:"proofTransactionHash"`
	ProofUrl             string    `json:"proofUrl"`
	PublicProof          string    `json:"publicProof"`
	Timestamp            time.Time `json:"timestamp"`
	TransactionHash      string    `json:"transactionHash"`
	Typename             string    `json:"typename"`
	URL                  string    `json:"url"`
}

type DynamoConnectionParams struct {
	Ctx       context.Context
	TableName string
	Svc       *dynamodb.Client
}

var svc *dynamodb.Client
var connParams DynamoConnectionParams

func init() {
	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		log.Fatalf("unable to load SDK config, %v", err)
	}
	if err != nil {
		fmt.Printf("error loading AWS configuration: %v\n", err)
		return
	}

	svc = dynamodb.NewFromConfig(cfg)
	connParams = DynamoConnectionParams{
		TableName: "Ethdam2024Stack-CoreTable97EB8292-FNZVVNFAYQKV",
		Svc:       svc,
		Ctx:       context.Background(),
	}
}

func CreateAPIGatewayProxyResponse(statusCode int, body string, additionalHeaders map[string]string) (events.APIGatewayProxyResponse, error) {
	headers := map[string]string{
		"Content-Type": "application/json",
	}

	for key, value := range additionalHeaders {
		headers[key] = value
	}

	response := events.APIGatewayProxyResponse{
		StatusCode:      statusCode,
		Headers:         headers,
		Body:            body,
		IsBase64Encoded: false,
	}

	return response, nil
}

func HandleRequest(ctx context.Context, request events.APIGatewayV2HTTPRequest) (events.APIGatewayProxyResponse, error) {
	switch request.RequestContext.HTTP.Method {
	case "GET":
		return handleGetRequest(request)
	case "POST":
		return handlePostRequest(request)
	default:
		return CreateAPIGatewayProxyResponse(405, "Method Not Allowed", nil)
	}
}

func handleGetRequest(request events.APIGatewayV2HTTPRequest) (events.APIGatewayProxyResponse, error) {
	fmt.Println((request.RequestContext.HTTP.Path))
	switch request.RequestContext.HTTP.Path {
	case "/v1/events":
		return handleListEvents(request)
	default:
		return CreateAPIGatewayProxyResponse(404, "Not Found", map[string]string{
			"Content-Type": "application/json",
		})
	}
}

func handlePostRequest(request events.APIGatewayV2HTTPRequest) (events.APIGatewayProxyResponse, error) {
	fmt.Println((request.RequestContext.HTTP.Path))
	switch request.RequestContext.HTTP.Path {
	case "/v1/events":
		return handleValidateProof(request)
	default:
		return CreateAPIGatewayProxyResponse(404, "Not Found", map[string]string{
			"Content-Type": "application/json",
		})
	}
}

func Query[T any](connParams DynamoConnectionParams, indexName *string, keyCondition expression.KeyConditionBuilder, filterCondition *expression.ConditionBuilder, handlePagination bool, limit ...int32) ([]T, error) {
	var items []T
	var lastEvaluatedKey map[string]types.AttributeValue
	var fetchLimit int32 // 0 indicates no limit

	fetchLimit = 1000
	if len(limit) > 0 {
		fetchLimit = limit[0]
	}

	for {
		builder := expression.NewBuilder().WithKeyCondition(keyCondition)
		if filterCondition != nil {
			builder = builder.WithFilter(*filterCondition)
		}
		expr, err := builder.Build()
		if err != nil {
			return nil, fmt.Errorf("failed to build expression: %w", err)
		}

		queryInput := &dynamodb.QueryInput{
			TableName:                 aws.String(connParams.TableName),
			KeyConditionExpression:    expr.KeyCondition(),
			FilterExpression:          expr.Filter(),
			ExpressionAttributeNames:  expr.Names(),
			ExpressionAttributeValues: expr.Values(),
			Limit:                     &fetchLimit,
			ExclusiveStartKey:         lastEvaluatedKey,
		}

		// Set the IndexName only if provided
		if indexName != nil {
			queryInput.IndexName = indexName
		}

		resp, err := connParams.Svc.Query(connParams.Ctx, queryInput)
		if err != nil {
			return nil, fmt.Errorf("failed to query DynamoDB: %w", err)
		}

		var batchItems []T
		if err := attributevalue.UnmarshalListOfMaps(resp.Items, &batchItems); err != nil {
			return nil, fmt.Errorf("failed to unmarshal response items: %w", err)
		}
		items = append(items, batchItems...)

		if !handlePagination || resp.LastEvaluatedKey == nil {
			break
		}
		lastEvaluatedKey = resp.LastEvaluatedKey
	}

	return items, nil
}

func handleValidateProof(request events.APIGatewayV2HTTPRequest) (events.APIGatewayProxyResponse, error) {
	var proverBody ProverEvent
	fmt.Println(request.Body)
	err := json.Unmarshal([]byte(request.Body), &proverBody)
	if err != nil {
		fmt.Printf("Error unmarshalling request body: %v\n", err)
		return CreateAPIGatewayProxyResponse(400, "Bad Request", nil)
	}

	if proverBody.Event.Proof == "" || proverBody.Event.PublicData == "" || proverBody.Event.VK == "" {
		fmt.Printf("Missing required fields in request body\n")
		return CreateAPIGatewayProxyResponse(400, "Bad Request", nil)
	}

	output, err := invokeVerifierLambdaFunction("Ethdam2024Stack-handleVerifierFunctionD32ABCBE-Kw6mf3INs1PG", proverBody)
	if err != nil {
		fmt.Printf("Error invoking verifier lambda function: %v\n", err)
		return CreateAPIGatewayProxyResponse(500, "Internal Server Error", nil)
	}

	return CreateAPIGatewayProxyResponse(200, string(output), nil)
}

func handleListEvents(request events.APIGatewayV2HTTPRequest) (events.APIGatewayProxyResponse, error) {
	var handlePagination = false

	// Initialize key condition for the query
	keyCondition := expression.Key("typename").Equal(expression.Value("Event"))

	// Start with no filter condition
	var filterCondition *expression.ConditionBuilder

	// Optional index name for the query
	indexName := "byTypename"

	// Execute the query
	results, err := Query[Event](connParams, &indexName, keyCondition, filterCondition, handlePagination, 100)
	if err != nil {
		fmt.Printf("Error querying DynamoDB: %v\n", err)
		return CreateAPIGatewayProxyResponse(500, "Internal Server Error", nil)
	}

	// Marshal the results to JSON and return the response
	responseBody, err := json.Marshal(results)
	if err != nil {
		fmt.Printf("Error marshalling response: %v\n", err)
		return CreateAPIGatewayProxyResponse(500, "Error preparing response", nil)
	}

	return CreateAPIGatewayProxyResponse(200, string(responseBody), nil)
}

type ProverEvent struct {
	Event ProverPayload `json:"event"`
}

type ProverPayload struct {
	Proof      string `json:"proof"`
	PublicData string `json:"public_data"`
	VK         string `json:"vk"`
}

func invokeVerifierLambdaFunction(functionName string, payload ProverEvent) (string, error) {
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
		InvocationType: lt.InvocationTypeRequestResponse,
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
