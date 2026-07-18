import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

interface BuildStep {
  name: string;
  command: string;
}

const steps: BuildStep[] = [
  { name: 'Prisma Generate', command: 'prisma generate' },
  { name: 'TypeScript Compilation', command: 'tsc -p tsconfig.lambda.json' },
  { name: 'Path Alias Resolution', command: 'tsc-alias -p tsconfig.lambda.json' },
];

export async function buildLambda(): Promise<void> {
  console.log('\n🔨 Starting Lambda build pipeline...\n');

  for (const step of steps) {
    try {
      execSync(step.command, { stdio: 'inherit' });
      console.log(`✅ ${step.name} completed successfully`);
    } catch (error) {
      const exitCode =
        error instanceof Error && 'status' in error ? (error as { status: number }).status : 1;
      const reason = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ ${step.name} failed: ${reason}`);
      console.error(`   Exit code: ${exitCode}`);
      process.exit(typeof exitCode === 'number' ? exitCode : 1);
    }
  }

  console.log('\n✅ Lambda build pipeline completed successfully');
  console.log('   Output: dist/lambdas/api-server/\n');
}

// Run directly when executed as a script
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  buildLambda();
}
