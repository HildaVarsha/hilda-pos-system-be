import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUTPUT_DIR = path.resolve('dist', 'lambdas', 'api-server');

interface BuildStep {
  name: string;
  command: string;
}

const steps: BuildStep[] = [
  { name: 'Prisma Generate', command: 'prisma generate' },
  {
    name: 'Bundle with esbuild',
    command: [
      'npx esbuild src/lambdas/api-server/index.ts',
      '--bundle',
      '--platform=node',
      '--target=node20',
      '--format=cjs',
      `--outdir=${OUTPUT_DIR}`,
      '--external:@prisma/client',
      '--external:bcrypt',
      '--external:socket.io',
    ].join(' '),
  },
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
  console.log(`   Output: ${OUTPUT_DIR}\n`);
}

// Run directly when executed as a script
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  buildLambda();
}
