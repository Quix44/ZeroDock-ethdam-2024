#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import 'source-map-support/register';
import { Ethdam2024Stack } from '../lib/ethdam-2024-stack';

const app = new cdk.App();
new Ethdam2024Stack(app, 'Ethdam2024Stack', {});