// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { Message, SQSClient, SendMessageCommand, SendMessageCommandInput, SendMessageCommandOutput } from "@aws-sdk/client-sqs";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { EventFilter, ethers } from "ethers";
import { Consumer } from "sqs-consumer";
import { WebSocketProvider } from "./wss";

console.log(`Container Started..`);

const ABI = [{ "inputs": [], "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "b", "type": "uint256" }], "name": "Process", "type": "event" }, { "inputs": [{ "internalType": "uint256", "name": "a", "type": "uint256" }, { "internalType": "uint256", "name": "b", "type": "uint256" }], "name": "generate", "outputs": [], "stateMutability": "nonpayable", "type": "function" }]

const EXECUTOR_QUEUE_URL = process.env.EXECUTOR_QUEUE_URL as string
const dynamoClient = new DynamoDBClient({});
const sqsClient = new SQSClient({})
const dynamoDocClient = DynamoDBDocumentClient.from(dynamoClient)

// Create a map that stores Contracts in it based on the listener ID
const listenerMap = new Map<string, ethers.Contract>();

type SocketListenerPayload = {}

const handleMessage = async (message: Message): Promise<void | Message> => {
  console.log(`New Message Arrived..`, message);
  // const json = JSON.parse(message.Body as string);
  await processMessage();
  return message
}

export function bigIntReplacer(_: any, value: { toString: () => any; }) {
  if (typeof value === 'bigint') {
    return value.toString();
  } else {
    return value;
  }
}

export const generateFilters = (address: string, eventHandlers: string[]): EventFilter => {
  if (eventHandlers.length) {
    return {
      address,
      topics: eventHandlers.map((eventHandler) => ethers.utils.id(eventHandler))
    }
  }
  return {
    address,
    topics: []
  }
};

const sendMessage = async (
  queueUrl: string,
  client: SQSClient,
  messageBody: any,
  messageDelaySeconds?: number,
  messageGroupId?: string,
  messageDeduplicationId?: string
): Promise<SendMessageCommandOutput | null> => {
  // Prepare the command payload
  const payload: SendMessageCommandInput = {
    QueueUrl: queueUrl,
    MessageBody: messageBody
  };

  // Add optional parameters for FIFO queues
  if (messageGroupId) {
    payload.MessageGroupId = messageGroupId;
  }
  if (messageDeduplicationId) {
    payload.MessageDeduplicationId = messageDeduplicationId;
  }
  if (messageDelaySeconds) {
    payload.DelaySeconds = messageDelaySeconds;
  }

  // Create the command with the specified queue URL and message body
  const command = new SendMessageCommand(payload);

  try {
    // Send the message to the SQS queue and await the response
    return await client.send(command);
  } catch (error) {
    // If the message fails to send, log the error
    console.error("Error sending message to SQS:", error);
    return null
  }
};

const processMessage = async (): Promise<void | Message> => {
  console.log('Processing - Message..')
  const _contract = "0x0ba547Ae5BCcf9a028aD69e0443268d46f9C28C1"
  const filter = generateFilters(_contract, ["Process(uint256,uint256)"])
  const id = "123456"
  const wssEndpoint = process.env.WSS_ENDPOINT as string

  // Create/get the socket connection
  const socket = WebSocketProvider.getInstance(
    id, [wssEndpoint]
  );

  const handleNewEvent = async (...args: any[]): Promise<void> => {
    console.log("New On-Chain Event Received..")
    const event = args[args.length - 1] as ethers.Event
    const _interface = new ethers.utils.Interface(ABI);
    const parsedLog = _interface.parseLog(event);

    const socketListenerPayload: SocketListenerPayload = {
      abi: ABI,
      index: event.logIndex,
      address: event.address,
      transactionHash: event.transactionHash,
      blockNumber: event.blockNumber,
      log: parsedLog
    };

    await sendMessage(
      EXECUTOR_QUEUE_URL,
      sqsClient,
      JSON.stringify(socketListenerPayload, bigIntReplacer),
      0, // No delay
      undefined,
      undefined
    )
  };

  // Clear the subscription and resubscribe
  const contract = new ethers.Contract(_contract, ABI, socket);
  contract.on(filter, handleNewEvent);
  listenerMap.set(id, contract);
  console.log("Now Listneing...")

  return
}

const app = Consumer.create({
  queueUrl: process.env.SQS_QUEUE_URL as string,
  sqs: sqsClient,
  shouldDeleteMessages: true,
  batchSize: 1,
  handleMessage
});

app.on("stopped", async () => {
  throw new Error("Container Stopped..");
});

app.on("error", async (err) => {
  throw new Error("Container Error, Restarting by terminating..");
});

app.on("processing_error", async (err) => {
});

app.on("started", async () => {
  console.log(`Now listening for new requests..`);
});

app.start();



