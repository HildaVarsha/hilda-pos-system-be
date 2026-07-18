import { execSync } from 'node:child_process';
import { copyFile, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createZipArchive, removeDirectory } from './utils/os.js';

const LAYER_DIR = path.resolve('layers', 'dependencies', 'nodejs');
const NODE_MODULES_DIR = path.join(LAYER_DIR, 'node_modules');
const LAYER_SOURCE_DIR = path.resolve('layers', 'dependencies');
const ZIP_OUTPUT = path.resolve('layers', 'dependencies.zip');
const MAX_SIZE_BYTES = 250 * 1024 * 1024; // 250 MB

/**
 * Recursively calculates the total size of all files in a directory.
 */
async function getDirectorySize(dirPath: string): Promise<number> {
  let totalSize = 0;
  const entries = await readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      totalSize += await getDirectorySize(entryPath);
    } else {
      const fileStat = await stat(entryPath);
      totalSize += fileStat.size;
    }
  }

  return totalSize;
}

/**
 * Checks if any packages that are ONLY in devDependencies (not also in
 * dependencies) were installed in the layer's node_modules.
 *
 * Packages that appear in both devDependencies and as transitive production
 * dependencies are legitimate and should NOT be flagged.
 */
async function findDevDependenciesInNodeModules(
  packageJsonPath: string,
  nodeModulesPath: string,
): Promise<string[]> {
  const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
  const packageJson = JSON.parse(packageJsonContent) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const prodDeps = new Set(Object.keys(packageJson.dependencies || {}));
  const devDeps = Object.keys(packageJson.devDependencies || {});

  // Only check devDependencies that are NOT also listed in production dependencies
  const devOnly = devDeps.filter((dep) => !prodDeps.has(dep));

  // Use npm ls to get the actual production dependency tree — packages that
  // appear here are legitimate transitive production dependencies
  let prodTreePackages = new Set<string>();
  try {
    const output = execSync('npm ls --omit=dev --all --json', {
      cwd: path.dirname(nodeModulesPath),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const tree = JSON.parse(output) as { dependencies?: Record<string, unknown> };
    prodTreePackages = collectPackageNames(tree);
  } catch {
    // If npm ls fails (e.g. peer dep issues), fall back to a simpler check:
    // only flag packages that are dev-only AND present in node_modules
    // This is the less-strict fallback
  }

  const offending: string[] = [];

  for (const dep of devOnly) {
    // Skip if this package is a legitimate transitive production dependency
    if (prodTreePackages.has(dep)) {
      continue;
    }

    const depPath = path.join(nodeModulesPath, dep);
    try {
      await stat(depPath);
      offending.push(dep);
    } catch {
      // Package not found in node_modules — that's expected
    }
  }

  return offending;
}

/**
 * Recursively collects all package names from an npm ls --json output tree.
 */
function collectPackageNames(
  node: { dependencies?: Record<string, unknown> },
  collected = new Set<string>(),
): Set<string> {
  if (node.dependencies) {
    for (const [name, value] of Object.entries(node.dependencies)) {
      collected.add(name);
      if (value && typeof value === 'object') {
        collectPackageNames(value as { dependencies?: Record<string, unknown> }, collected);
      }
    }
  }
  return collected;
}

/**
 * Builds the Lambda Layer by installing production dependencies
 * and creating a zip archive.
 */
export async function buildLayer(): Promise<void> {
  console.log('\n📦 Starting Lambda Layer packaging...\n');

  // Step 1: Clean layer directory
  try {
    await removeDirectory(NODE_MODULES_DIR);
    console.log('✅ Clean Layer Directory completed successfully');
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Clean Layer Directory failed: ${reason}`);
    process.exit(1);
  }

  // Step 2: Copy package.json and package-lock.json to layer directory
  try {
    await mkdir(LAYER_DIR, { recursive: true });
    const projectRoot = path.resolve('.');

    // Copy package.json with scripts stripped to avoid running lifecycle hooks (e.g. husky prepare)
    // Also remove @prisma/client since the generated Prisma client is bundled with the
    // Lambda function code (not the layer). This avoids pulling in prisma CLI, typescript,
    // and effect as transitive dependencies (~200MB savings).
    const pkgContent = await readFile(path.join(projectRoot, 'package.json'), 'utf-8');
    const pkg = JSON.parse(pkgContent) as Record<string, unknown>;
    delete pkg.scripts;
    delete pkg['lint-staged'];

    // Remove @prisma/client — its generated runtime is included in the function code bundle
    const deps = pkg.dependencies as Record<string, string> | undefined;
    if (deps) {
      delete deps['@prisma/client'];
    }

    await writeFile(path.join(LAYER_DIR, 'package.json'), JSON.stringify(pkg, null, 2));

    await copyFile(
      path.join(projectRoot, 'package-lock.json'),
      path.join(LAYER_DIR, 'package-lock.json'),
    );
    console.log('✅ Copy Package Files completed successfully');
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Copy Package Files failed: ${reason}`);
    process.exit(1);
  }

  // Step 3: Install production dependencies
  try {
    execSync('npm install --omit=dev', { cwd: LAYER_DIR, stdio: 'inherit' });
    console.log('✅ Install Production Dependencies completed successfully');
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Install Production Dependencies failed: ${reason}`);
    process.exit(1);
  }

  // Step 4: Verify no devDependencies are present
  try {
    const projectPackageJson = path.resolve('package.json');
    const offending = await findDevDependenciesInNodeModules(projectPackageJson, NODE_MODULES_DIR);

    if (offending.length > 0) {
      console.error(
        `❌ DevDependency Verification failed: found devDependencies in layer: ${offending.join(', ')}`,
      );
      process.exit(1);
    }
    console.log('✅ DevDependency Verification completed successfully');
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ DevDependency Verification failed: ${reason}`);
    process.exit(1);
  }

  // Step 5: Validate unzipped size
  try {
    const totalSize = await getDirectorySize(LAYER_SOURCE_DIR);
    const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);

    if (totalSize > MAX_SIZE_BYTES) {
      console.error(`❌ Size Validation failed: layer size ${sizeMB} MB exceeds 250 MB limit`);
      process.exit(1);
    }
    console.log(`✅ Size Validation completed successfully (${sizeMB} MB)`);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Size Validation failed: ${reason}`);
    process.exit(1);
  }

  // Step 6: Create zip archive
  try {
    createZipArchive(LAYER_SOURCE_DIR, ZIP_OUTPUT);
    console.log('✅ Create Zip Archive completed successfully');
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Create Zip Archive failed: ${reason}`);
    process.exit(1);
  }

  console.log('\n✅ Lambda Layer packaging completed successfully');
  console.log(`   Output: ${ZIP_OUTPUT}\n`);
}

// Run directly when executed as a script
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  buildLayer();
}
