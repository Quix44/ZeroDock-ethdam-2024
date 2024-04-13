package main

import (
	"context"
	"crypto/ecdsa"
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

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	ct "github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

var tableName = "Ethdam2024Stack-CoreTable97EB8292-FNZVVNFAYQKV"
var proverContract = "0x3631aB2fFA825F00d534E7cb831cC8C66b5d6f4b"
var connParams DynamoParams

type ProofOutput struct {
	Proof      string `json:"proof"`
	PublicData string `json:"public_data"`
}

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
		// The SHA of the Docker Container
		SHA: "bd01e031ba3610a4d7ef4c80214b868d8d89cf7ead2479c0960f37c7e46429b9",
	}

	proverPayload := ProverPayload{
		Event: proverEvent,
	}
	proverInvoke, err := invokeProverLambdaFunction(proverContainer, proverPayload)
	if err != nil {
		return err
	}
	fmt.Println("Prover ", proverInvoke)

	var proofOutput ProofOutput
	err = json.Unmarshal([]byte(proverInvoke), &proofOutput)
	if err != nil {
		log.Fatalf("Error parsing JSON: %s", err)
	}

	_proofWriterEvent := ProofWriterEvent{
		Proof:          proofOutput.Proof,
		PublicData:     proofOutput.PublicData,
		TargetContract: proverContract,
		RPCEndpoint:    "wss://cosmological-long-violet.base-sepolia.quiknode.pro/77b360c7f8668f55c31ea3bb6b4a086f9e06bf1d/",
		ChainID:        84532,
	}
	storedProof, err := storeProof(_proofWriterEvent)
	if err != nil {
		return err
	}

	url := fmt.Sprintf("https://sepolia.basescan.org/tx/%s", payload.TransactionHash)
	proofUrl := fmt.Sprintf("https://sepolia.basescan.org/tx/%s", storedProof)

	ts := time.Now().UTC().Format("2006-01-02T15:04:05Z07:00")

	proof := ProofEvent{
		ID:                   cleanHexStr,
		TransactionHash:      payload.TransactionHash,
		URL:                  url,
		ProofURL:             proofUrl,
		Chain:                "Base",
		Timestamp:            ts,
		EventName:            "Process",
		Typename:             "Event",
		PublicProof:          proofOutput.PublicData,
		Proof:                proofOutput.Proof,
		ProofTransactionHash: storedProof,
	}
	err = PutItem(connParams, proof)
	if err != nil {
		return err
	}

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
	ID                   string `dynamodbav:"id"`
	TransactionHash      string `dynamodbav:"transactionHash"`
	URL                  string `dynamodbav:"url"`
	ProofTransactionHash string `dynamodbav:"proofTransactionHash"`
	PublicProof          string `dynamodbav:"publicProof"`
	ProofURL             string `dynamodbav:"proofUrl"`
	Proof                string `dynamodbav:"proof"`
	EventName            string `dynamodbav:"eventName"`
	Chain                string `dynamodbav:"chain"`
	Typename             string `dynamodbav:"typename"`
	Timestamp            string `dynamodbav:"timestamp"`
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

type ProofWriterEvent struct {
	TargetContract string `targetContract:"json"`
	Proof          string `proof:"json"`
	PublicData     string `publicData:"json"`
	RPCEndpoint    string `RPCEndpoint:"json"`
	ChainID        int    `ChainID:"json"`
}

func storeProof(proofEvent ProofWriterEvent) (string, error) {
	pk := os.Getenv("PK")
	if pk == "" {
		return "", fmt.Errorf("private Key not set in environment")
	}

	// targetContractAddress := repoMetadata.PayeeAddress
	targetContractAddress := proofEvent.TargetContract
	rpc := proofEvent.RPCEndpoint
	chainID := proofEvent.ChainID
	publicData := proofEvent.PublicData
	proof := proofEvent.Proof

	// Parse the contract ABI or we could load it from a file then parse it rather than env
	parsedABI, err := abi.JSON(strings.NewReader(contractABI))
	if err != nil {
		return "", fmt.Errorf("failed to parse contract ABI: %v", err)
	}

	// Set up Ethereum client
	client, err := ethclient.Dial(rpc)
	if err != nil {
		return "", fmt.Errorf("error creating Ethereum client: %v", err)
	}

	inputData, err := parsedABI.Pack("store", &proof, &publicData)
	if err != nil {
		return "", fmt.Errorf("failed to pack input data: %v", err)
	}

	// Convert the contract address from a string to a common.Address
	contractAddress := common.HexToAddress(targetContractAddress)

	// Load the Private Key
	privateKey, err := crypto.HexToECDSA(pk)
	if err != nil {
		return "", fmt.Errorf("error loading private key: %v", err)
	}

	// Get the public key from the private key
	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return "", fmt.Errorf("error casting public key to ECDSA")
	}

	// Get the address from the public key
	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)
	nonce, err := client.PendingNonceAt(context.Background(), fromAddress)
	if err != nil {
		return "", fmt.Errorf("error getting nonce: %v", err)
	}

	gasPrice, err := client.SuggestGasPrice(context.Background())
	if err != nil {
		fmt.Printf("error getting gas price: %v\n", err)
		return "", err
	}

	// add a 10% buffer to the gas price
	gasPrice = new(big.Int).Mul(gasPrice, big.NewInt(110))
	gasLimit := uint64(1000000)

	// Create the transaction
	tx := ct.NewTransaction(nonce, contractAddress, big.NewInt(int64(0)), gasLimit, gasPrice, inputData)
	log.Printf("tx: %v", tx)

	// Sign the transaction
	signedTx, err := ct.SignTx(tx, ct.NewEIP155Signer(big.NewInt(int64(chainID))), privateKey)
	if err != nil {
		return "", fmt.Errorf("error signing transaction: %v", err)
	}

	err = client.SendTransaction(context.Background(), signedTx)
	if err != nil {
		return "", fmt.Errorf("error sending transaction: %v", err)
	}

	// Create a context with cancel
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel() // This will cancel the context when the function exits

	// Wait for the transaction to be confirmed using the waitTxConfirmed function
	txChan := waitTxConfirmed(ctx, client, signedTx.Hash())

	// Use the channel to wait for the transaction to be confirmed
	confirmedTx := <-txChan

	// After receiving the confirmed transaction, check if it is nil (which would be the case if the channel was closed without sending a transaction)
	if confirmedTx == nil {
		return "", fmt.Errorf("transaction confirmation was cancelled or an error occurred")
	}

	// Transaction is confirmed
	fmt.Printf("Transaction confirmed: %s\n", confirmedTx.Hash().String())
	return confirmedTx.Hash().String(), nil
}

// Returns a channel that blocks until the transaction is confirmed
func waitTxConfirmed(ctx context.Context, c *ethclient.Client, hash common.Hash) <-chan *ct.Transaction {
	ch := make(chan *ct.Transaction)
	go func() {
		defer close(ch) // Ensure the channel is closed when the goroutine exits
		for {
			select {
			case <-ctx.Done(): // Check if the context has been cancelled
				return
			default:
				tx, pending, err := c.TransactionByHash(ctx, hash)
				if err == nil && !pending {
					ch <- tx
					return // Exit the goroutine after sending the confirmed transaction
				}
				time.Sleep(time.Millisecond * 500)
			}
		}
	}()
	return ch
}

const contractABI = `[
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "proof",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "publicData",
          "type": "string"
        }
      ],
      "name": "store",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]`

func main() {
	lambda.Start(HandleRequest)
}
