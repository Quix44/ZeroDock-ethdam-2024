import * as cdk from 'aws-cdk-lib';
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { AttributeType, BillingMode, ProjectionType, Table, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Cluster, ContainerImage, FargateService, FargateTaskDefinition, LogDrivers } from 'aws-cdk-lib/aws-ecs';
import { Architecture, DockerImageCode, DockerImageFunction } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import path = require('path');

export class Ethdam2024Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const listenerQueue = new sqs.Queue(this, 'ListenerQueue', {
      visibilityTimeout: cdk.Duration.seconds(15)
    });

    const executionQueue = new sqs.Queue(this, 'ExecutionQUeue', {
      visibilityTimeout: cdk.Duration.seconds(15)
    });

    const coreTable = new Table(this, "CoreTable", {
      partitionKey: { name: "id", type: AttributeType.STRING },
      encryption: TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'ttl',
      billingMode: BillingMode.PAY_PER_REQUEST,
    });
    coreTable.addGlobalSecondaryIndex({
      indexName: "byTypename",
      partitionKey: {
        name: "typename",
        type: AttributeType.STRING,
      },
      projectionType: ProjectionType.ALL,
    });

    // Responsible for listening to websocket events from smart contracts
    // const listenerFunction = new DockerImageFunction(
    //   this,
    //   "listenerFunction",
    //   {
    //     code: DockerImageCode.fromImageAsset("src/lambda/socket-listener"),
    //     logRetention: RetentionDays.ONE_MONTH,
    //     memorySize: 256,
    //     architecture: Architecture.ARM_64,
    //     timeout: cdk.Duration.seconds(15),
    //     environment: {
    // CORE_TABLE: coreTable.tableName,
    // SQS_QUEUE_URL: listenerQueue.queueUrl,
    // WSS_ENDPOINT: "wss://cosmological-long-violet.base-sepolia.quiknode.pro/77b360c7f8668f55c31ea3bb6b4a086f9e06bf1d/",
    // EXECUTOR_QUEUE_URL: executionQueue.queueUrl
    //     },
    //   }
    // );
    // listenerFunction.addEventSourceMapping('ListenerEventSource', {
    //   eventSourceArn: listenerQueue.queueArn,
    //   batchSize: 1,
    // })
    // coreTable.grantReadWriteData(listenerFunction)
    // executionQueue.grantSendMessages(listenerFunction)
    // listenerQueue.grantConsumeMessages(listenerFunction)

    // Winston Clouydwatch Logs Access
    // task.addToTaskRolePolicy(new iam.PolicyStatement({
    //   actions: [
    //     "logs:CreateLogGroup",
    //     "logs:CreateLogStream",
    //     "logs:PutLogEvents",
    //     "logs:DescribeLogStreams"
    //   ],
    //   resources: ["*"],
    // }))

    // Socket Listener ECS
    const vpc = new ec2.Vpc(this, 'SocketListenerVpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'PublicSubnet',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    const ecsCluster = new Cluster(this, "EcsCluster", {
      vpc,
      clusterName: `ECS-Cluster`,
    });

    const eTask = new FargateTaskDefinition(this, 'SocketListenerFargate', {
      memoryLimitMiB: 1024,
      cpu: 512,
    });

    eTask.addContainer('SocketListenerContainer', {
      image: ContainerImage.fromAsset(path.join(__dirname, '../src/lambda/socket-listener')),
      logging: LogDrivers.awsLogs({
        streamPrefix: 'Hackathon',
      }),
      environment: {
        CORE_TABLE: coreTable.tableName,
        SQS_QUEUE_URL: listenerQueue.queueUrl,
        WSS_ENDPOINT: "wss://cosmological-long-violet.base-sepolia.quiknode.pro/77b360c7f8668f55c31ea3bb6b4a086f9e06bf1d/",
        EXECUTOR_QUEUE_URL: executionQueue.queueUrl
      },
    });
    listenerQueue.grantConsumeMessages(eTask.taskRole)
    executionQueue.grantSendMessages(eTask.taskRole)
    coreTable.grantReadWriteData(eTask.taskRole)


    const httpApi = new apigatewayv2.HttpApi(this, "HttpApi", {
      apiName: "Hackathon API",
      description: "API for hackathon",
      corsPreflight: {
        allowCredentials: false,
        // exposeHeaders: ["*"],
        allowHeaders: ["*"], // work out what headers are required
        maxAge: cdk.Duration.minutes(1),
        allowMethods: [
          apigatewayv2.CorsHttpMethod.OPTIONS,
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.DELETE,
          apigatewayv2.CorsHttpMethod.PUT,
          apigatewayv2.CorsHttpMethod.POST,
        ],
        allowOrigins: ["http://localhost:3000"],
      },
      disableExecuteApiEndpoint: false,
    })


    const apiHandler = new DockerImageFunction(
      this,
      "apiHandlerFunction",
      {
        code: DockerImageCode.fromImageAsset("src/lambda/api"),
        logRetention: RetentionDays.ONE_MONTH,
        memorySize: 256,
        architecture: Architecture.ARM_64,
        timeout: cdk.Duration.seconds(15),
        environment: {},
      }
    );

    httpApi.addRoutes({
      path: "/v1/events",
      integration: new HttpLambdaIntegration('HttpApiEndpoint', apiHandler),
      methods: [apigatewayv2.HttpMethod.GET, apigatewayv2.HttpMethod.POST],
      authorizer: new apigatewayv2.HttpNoneAuthorizer()
    });
    coreTable.grantReadWriteData(apiHandler)

    // Create a Fargate Service to run the task definition
    const fargateService = new FargateService(this, 'ListenerService', {
      cluster: ecsCluster,
      desiredCount: 1,
      taskDefinition: eTask,
      assignPublicIp: true,
    });

    const proverFunction = new DockerImageFunction(
      this,
      "handleProverFunction",
      {
        code: DockerImageCode.fromImageAsset("src/lambda/prover"),
        logRetention: RetentionDays.ONE_MONTH,
        memorySize: 256,
        architecture: Architecture.ARM_64,
        timeout: cdk.Duration.seconds(15),
        environment: {},
      }
    );

    const verifierFunction = new DockerImageFunction(
      this,
      "handleVerifierFunction",
      {
        code: DockerImageCode.fromImageAsset("src/lambda/verify"),
        logRetention: RetentionDays.ONE_MONTH,
        memorySize: 256,
        architecture: Architecture.ARM_64,
        timeout: cdk.Duration.seconds(15),
        environment: {},
      }
    );
    verifierFunction.grantInvoke(apiHandler)


    const setupFunction = new DockerImageFunction(
      this,
      "handleSetupFunction",
      {
        code: DockerImageCode.fromImageAsset("src/lambda/setup"),
        logRetention: RetentionDays.ONE_MONTH,
        memorySize: 256,
        architecture: Architecture.ARM_64,
        timeout: cdk.Duration.seconds(15),
        environment: {},
      }
    );

    // User Client Application
    const userClientContainer = new DockerImageFunction(
      this,
      "handleUserAppFunction",
      {
        code: DockerImageCode.fromImageAsset("src/lambda/user_app"),
        logRetention: RetentionDays.ONE_MONTH,
        memorySize: 256,
        architecture: Architecture.ARM_64,
        timeout: cdk.Duration.seconds(15),
        environment: {
          USER_CONTAINER_NAME: "",
          PROVER_CONTAINER_NAME: ""
        },
      }
    );

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
    coreTable.grantReadWriteData(executorFunction)
    proverFunction.grantInvoke(executorFunction)
    userClientContainer.grantInvoke(executorFunction)

    executionQueue.grantConsumeMessages(executorFunction)
    executorFunction.addEventSourceMapping('ExecutorEventSource', {
      eventSourceArn: executionQueue.queueArn,
      batchSize: 1,
    })
  }
}
