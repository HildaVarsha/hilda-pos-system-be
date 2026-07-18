import * as cdk from 'aws-cdk-lib';
import { HildaPosStack } from './stack.js';

const app = new cdk.App();
const env = process.env.DEPLOY_ENV || 'dev';

new HildaPosStack(app, `HildaPosStack-${env}`, {
  // Use CLI credentials directly — no need for CDK bootstrap roles
  synthesizer: new cdk.CliCredentialsStackSynthesizer(),
});

app.synth();
