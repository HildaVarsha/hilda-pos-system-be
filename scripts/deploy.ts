import { execSync } from 'node:child_process';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'node:url';

import { buildLambda } from './build-lambda.js';
import { buildLayer } from './build-layer.js';

interface DeployOption {
  label: string;
  action: () => Promise<void>;
}

function getEnvironment(): string {
  return process.env.DEPLOY_ENV || 'dev';
}

function displaySuccess(operation: string, env: string): void {
  console.log(`\n✅ [${operation}] completed successfully`);
  console.log(`   Target environment: ${env}`);
}

function displayFailure(operation: string, reason: string, exitCode: number): void {
  console.error(`\n❌ [${operation}] failed: ${reason}`);
  console.error(`   Exit code: ${exitCode}`);
}

function runCdkDeploy(): void {
  execSync('npx cdk deploy --require-approval never', { stdio: 'inherit' });
}

async function deployLambdaFunction(env: string): Promise<void> {
  const operation = 'Deploy Lambda Function';
  try {
    await buildLambda();
    runCdkDeploy();
    displaySuccess(operation, env);
  } catch (error) {
    const exitCode =
      error instanceof Error && 'status' in error ? (error as { status: number }).status : 1;
    const reason = error instanceof Error ? error.message : 'Unknown error';
    displayFailure(operation, reason, typeof exitCode === 'number' ? exitCode : 1);
    process.exit(typeof exitCode === 'number' ? exitCode : 1);
  }
}

async function deployLambdaLayer(env: string): Promise<void> {
  const operation = 'Deploy Lambda Layer';
  try {
    await buildLayer();
    runCdkDeploy();
    displaySuccess(operation, env);
  } catch (error) {
    const exitCode =
      error instanceof Error && 'status' in error ? (error as { status: number }).status : 1;
    const reason = error instanceof Error ? error.message : 'Unknown error';
    displayFailure(operation, reason, typeof exitCode === 'number' ? exitCode : 1);
    process.exit(typeof exitCode === 'number' ? exitCode : 1);
  }
}

async function deployFunctionAndLayer(env: string): Promise<void> {
  const operation = 'Deploy Function + Layer';
  try {
    await buildLambda();
    await buildLayer();
    runCdkDeploy();
    displaySuccess(operation, env);
  } catch (error) {
    const exitCode =
      error instanceof Error && 'status' in error ? (error as { status: number }).status : 1;
    const reason = error instanceof Error ? error.message : 'Unknown error';
    displayFailure(operation, reason, typeof exitCode === 'number' ? exitCode : 1);
    process.exit(typeof exitCode === 'number' ? exitCode : 1);
  }
}

async function deployFullStack(env: string): Promise<void> {
  const operation = 'Deploy Full Stack';
  try {
    await buildLambda();
    await buildLayer();
    runCdkDeploy();
    displaySuccess(operation, env);
  } catch (error) {
    const exitCode =
      error instanceof Error && 'status' in error ? (error as { status: number }).status : 1;
    const reason = error instanceof Error ? error.message : 'Unknown error';
    displayFailure(operation, reason, typeof exitCode === 'number' ? exitCode : 1);
    process.exit(typeof exitCode === 'number' ? exitCode : 1);
  }
}

async function buildOnly(env: string): Promise<void> {
  const operation = 'Build Only';
  try {
    await buildLambda();
    displaySuccess(operation, env);
  } catch (error) {
    const exitCode =
      error instanceof Error && 'status' in error ? (error as { status: number }).status : 1;
    const reason = error instanceof Error ? error.message : 'Unknown error';
    displayFailure(operation, reason, typeof exitCode === 'number' ? exitCode : 1);
    process.exit(typeof exitCode === 'number' ? exitCode : 1);
  }
}

function displayMenu(env: string): void {
  console.log(`\n🚀 Hilda POS System - Deployment CLI`);
  console.log(`   Target environment: ${env}\n`);
  console.log('   Select a deployment option:\n');
  console.log('   1) Deploy Lambda Function only');
  console.log('   2) Deploy Lambda Layer only');
  console.log('   3) Deploy Function + Layer');
  console.log('   4) Deploy Full Stack (CDK)');
  console.log('   5) Build only (no deploy)');
  console.log('');
}

async function promptSelection(rl: readline.Interface): Promise<string> {
  const answer = await rl.question('   Enter selection (1-5): ');
  return answer.trim();
}

async function main(): Promise<void> {
  const env = getEnvironment();

  const options: DeployOption[] = [
    { label: 'Deploy Lambda Function only', action: () => deployLambdaFunction(env) },
    { label: 'Deploy Lambda Layer only', action: () => deployLambdaLayer(env) },
    { label: 'Deploy Function + Layer', action: () => deployFunctionAndLayer(env) },
    { label: 'Deploy Full Stack (CDK)', action: () => deployFullStack(env) },
    { label: 'Build only (no deploy)', action: () => buildOnly(env) },
  ];

  const rl = readline.createInterface({ input, output });

  try {
    let validSelection = false;

    while (!validSelection) {
      displayMenu(env);
      const selection = await promptSelection(rl);
      const index = parseInt(selection, 10) - 1;

      if (index >= 0 && index < options.length) {
        validSelection = true;
        rl.close();
        await options[index].action();
      } else {
        console.log('\n   ⚠️  Invalid option. Please select a number between 1 and 5.\n');
      }
    }
  } catch (error) {
    rl.close();
    const reason = error instanceof Error ? error.message : 'Unknown error';
    displayFailure('Deployment', reason, 1);
    process.exit(1);
  }
}

// Run directly when executed as a script
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  main();
}

export { main, getEnvironment, displayMenu, displaySuccess, displayFailure };
