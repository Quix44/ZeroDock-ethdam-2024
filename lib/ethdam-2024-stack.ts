import * as cdk from 'aws-cdk-lib';
import { Architecture, DockerImageCode, DockerImageFunction } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export class Ethdam2024Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const listenerQueue = new sqs.Queue(this, 'ListenerQueue', {
      visibilityTimeout: cdk.Duration.seconds(300)
    });

    // The container that acts as the clients container and creates
    const executorFunction = new DockerImageFunction(
      this,
      "handleExecutorFunction",
      {
        code: DockerImageCode.fromImageAsset("src/lambda/executor"),
        logRetention: RetentionDays.ONE_MONTH,
        memorySize: 256,
        architecture: Architecture.ARM_64,
        timeout: cdk.Duration.seconds(15),
        environment: {},
      }
    );

    // Responsible for listening to websocket events from smart contracts
    const listenerFunction = new DockerImageFunction(
      this,
      "listenerFunction",
      {
        code: DockerImageCode.fromImageAsset("src/lambda/listener"),
        logRetention: RetentionDays.ONE_MONTH,
        memorySize: 256,
        architecture: Architecture.ARM_64,
        timeout: cdk.Duration.seconds(15),
        environment: {},
      }
    );

    const proverFunction = new DockerImageFunction(
      this,
      "proverFunction",
      {
        code: DockerImageCode.fromImageAsset("src/lambda/prover"),
        logRetention: RetentionDays.ONE_MONTH,
        memorySize: 256,
        architecture: Architecture.ARM_64,
        timeout: cdk.Duration.seconds(15),
        environment: {},
      }
    );

  }
}
