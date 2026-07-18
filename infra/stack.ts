import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parses a .env file and returns a record of key-value pairs.
 */
function loadEnvFile(filePath: string): Record<string, string> {
  const content = readFileSync(filePath, 'utf-8');
  const envVars: Record<string, string> = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // Remove surrounding quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    envVars[key] = value;
  }

  return envVars;
}

export class HildaPosStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const env = process.env.DEPLOY_ENV || 'dev';

    // Load all variables from .env file to pass to Lambda
    const envFilePath = path.join(__dirname, '..', '.env');
    const envVars = loadEnvFile(envFilePath);

    const dependenciesLayer = new lambda.LayerVersion(this, 'DependenciesLayer', {
      layerVersionName: `${env}-hilda-pos-dependencies-layer`,
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'layers', 'dependencies')),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: `Production dependencies layer for ${env} environment`,
    });

    const apiServerFunction = new lambda.Function(this, 'ApiServerFunction', {
      functionName: `${env}-hilda-pos-api-server`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'dist', 'lambdas', 'api-server')),
      layers: [dependenciesLayer],
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      environment: envVars,
    });

    const api = new apigateway.LambdaRestApi(this, 'ApiGateway', {
      handler: apiServerFunction,
      proxy: true,
      restApiName: `${env}-hilda-pos-api-gateway`,
      deployOptions: {
        stageName: env,
      },
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
    });
  }
}
