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

func main() {
	lambda.Start(HandleRequest)
}
