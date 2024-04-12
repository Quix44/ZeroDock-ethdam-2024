import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export class Ethdam2024Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const listenerQueue = new sqs.Queue(this, 'ListenerQueue', {
      visibilityTimeout: cdk.Duration.seconds(300)
    });


  }
}
