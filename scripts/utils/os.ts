import { execSync } from 'node:child_process';
import { rm } from 'node:fs/promises';
import path from 'node:path';

/**
 * Detects whether the current host OS is Windows.
 * Requirement 6.3: Detect host OS via process.platform.
 */
export function isWindows(): boolean {
  return process.platform === 'win32';
}

/**
 * Creates a zip archive from a source directory.
 * Requirement 6.1: Uses PowerShell Compress-Archive on Windows, zip CLI on Unix.
 * Requirement 6.2: All paths constructed using Node.js path module APIs.
 */
export function createZipArchive(sourceDir: string, outputPath: string): void {
  const resolvedSource = path.resolve(sourceDir);
  const resolvedOutput = path.resolve(outputPath);

  if (isWindows()) {
    const sourcePath = path.join(resolvedSource, '*');
    execSync(
      `powershell -Command "Compress-Archive -Path \\"${sourcePath}\\" -DestinationPath \\"${resolvedOutput}\\" -Force"`,
      { stdio: 'inherit' },
    );
  } else {
    execSync(`zip -r "${resolvedOutput}" .`, {
      cwd: resolvedSource,
      stdio: 'inherit',
    });
  }
}

/**
 * Removes a directory recursively.
 * Requirement 6.2: Path constructed using Node.js path module APIs.
 */
export async function removeDirectory(dirPath: string): Promise<void> {
  const resolvedPath = path.resolve(dirPath);
  await rm(resolvedPath, { recursive: true, force: true });
}
