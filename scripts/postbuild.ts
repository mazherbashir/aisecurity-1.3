/**
 * Post-build script that copies non-TypeScript assets to the dist directory.
 *
 * This script runs automatically after the TypeScript build (tsdown) completes.
 * It handles:
 * - HTML template files (all *.html in src/)
 * - Python/Go/Ruby wrapper scripts for custom providers
 * - Drizzle ORM migration files
 * - ESM package.json marker
 * - CLI executable permissions
 *
 * @module scripts/postbuild
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SRC = path.join(ROOT, 'src');

/**
 * Wrapper types supported by the build.
 * IMPORTANT: Must match WrapperType in src/esm.ts (used by getWrapperDir()).
 * If you add a new wrapper type, update both files.
 */
const WRAPPER_TYPES = ['python', 'ruby', 'golang'] as const;
type WrapperType = (typeof WRAPPER_TYPES)[number];

/**
 * Wrapper files for each language type.
 * Maps wrapper type to the list of files that should be copied.
 */
const WRAPPER_FILES: Record<WrapperType, string[]> = {
  python: ['wrapper.py', 'persistent_wrapper.py'],
  ruby: ['wrapper.rb'],
  golang: ['wrapper.go'],
};

/**
 * Files/patterns to exclude when copying the drizzle directory.
 */
const DRIZZLE_EXCLUDE_PATTERNS = ['.md', 'CLAUDE', 'AGENTS'];

/**
 * Critical build outputs that must exist for the build to be valid.
 */
const REQUIRED_BUILD_OUTPUTS = [
  'dist/entrypoint.js', // CLI entry (Node version check wrapper)
  'dist/main.js', // CLI main module
  'dist/index.js', // ESM library entry
  'dist/index.cjs', // CJS library entry
  'dist/server/index.js', // Server entry
];

interface CopyTask {
  src: string;
  dest: string;
  recursive?: boolean;
  filter?: (src: string) => boolean;
}

interface PostbuildResult {
  success: boolean;
  copied: string[];
  errors: string[];
}

/**
 * Logs a message to stdout with consistent formatting.
 */
function log(message: string): void {
  console.log(`[postbuild] ${message}`);
}

/**
 * Logs an error message to stderr with consistent formatting.
 */
function logError(message: string): void {
  console.error(`[postbuild] ERROR: ${message}`);
}

/**
 * Find all HTML files in src/ directory (non-recursive).
 */
function getHtmlFiles(): CopyTask[] {
  try {
    return fs
      .readdirSync(SRC)
      .filter((file) => file.endsWith('.html'))
      .map((file) => ({
        src: path.join(SRC, file),
        dest: path.join(DIST, file),
      }));
  } catch (error) {
    logError(`Failed to read src/ directory: ${error}`);
    return [];
  }
}

/**
 * Generate copy tasks for all wrapper scripts.
 * Uses WRAPPER_TYPES and WRAPPER_FILES to ensure consistency with src/esm.ts
 *
 * Wrapper files are copied to two locations:
 * 1. dist/{python,ruby,golang}/ - for CLI builds (entrypoint.js, main.js)
 * 2. dist/server/{python,ruby,golang}/ - for bundled server build (server/index.js)
 *
 * This is necessary because getWrapperDir() uses import.meta.url to determine
 * the base directory. In the bundled server, import.meta.url points to
 * dist/server/index.js, so wrapper files need to be at dist/server/{type}/.
 */
function getWrapperTasks(): CopyTask[] {
  const tasks: CopyTask[] = [];

  // Destinations for wrapper files:
  // - dist/ for CLI (entrypoint.js, main.js use import.meta.url → dist/)
  // - dist/server/ for bundled server (server/index.js uses import.meta.url → dist/server/)
  const destBases = [path.join(DIST), path.join(DIST, 'server')];

  for (const wrapperType of WRAPPER_TYPES) {
    const files = WRAPPER_FILES[wrapperType];
    for (const file of files) {
      for (const destBase of destBases) {
        tasks.push({
          src: path.join(SRC, wrapperType, file),
          dest: path.join(destBase, wrapperType, file),
        });
      }
    }
  }

  return tasks;
}

/**
 * Get the drizzle migration copy task with exclusion filter.
 */
function getDrizzleTask(): CopyTask {
  return {
    src: path.join(ROOT, 'drizzle'),
    dest: path.join(DIST, 'drizzle'),
    recursive: true,
    filter: (src: string) => {
      const basename = path.basename(src);
      return !DRIZZLE_EXCLUDE_PATTERNS.some(
        (pattern) => basename.includes(pattern) || basename.endsWith(pattern),
      );
    },
  };
}

/**
 * Get the proto files copy task for OTLP protobuf support.
 */
function getProtoTask(): CopyTask {
  return {
    src: path.join(SRC, 'tracing', 'proto'),
    dest: path.join(DIST, 'tracing', 'proto'),
    recursive: true,
  };
}

/**
 * Verify that all critical build outputs exist.
 */
function verifyBuildOutputs(): string[] {
  const missing: string[] = [];

  for (const outputPath of REQUIRED_BUILD_OUTPUTS) {
    const fullPath = path.join(ROOT, outputPath);
    if (!fs.existsSync(fullPath)) {
      missing.push(outputPath);
    }
  }

  return missing;
}

/**
 * Clean destination directories before copying to prevent stale files.
 * Only cleans specific subdirectories, not all of dist/.
 */
function cleanDestinations(_tasks: CopyTask[]): void {
  // Clean wrapper directories (both at dist/ and dist/server/)
  const wrapperBases = [path.join(DIST), path.join(DIST, 'server')];
  for (const base of wrapperBases) {
    for (const wrapperType of WRAPPER_TYPES) {
      const wrapperDest = path.join(base, wrapperType);
      if (fs.existsSync(wrapperDest)) {
        fs.rmSync(wrapperDest, { recursive: true, force: true });
      }
    }
  }

  // Clean drizzle directory
  const drizzleDest = path.join(DIST, 'drizzle');
  if (fs.existsSync(drizzleDest)) {
    fs.rmSync(drizzleDest, { recursive: true, force: true });
  }
}

/**
 * Execute a single copy task.
 */
function executeCopyTask(task: CopyTask): { success: boolean; error?: string } {
  try {
    if (!fs.existsSync(task.src)) {
      return { success: false, error: `Source not found: ${task.src.replace(ROOT, '.')}` };
    }

    fs.mkdirSync(path.dirname(task.dest), { recursive: true });

    fs.cpSync(task.src, task.dest, {
      recursive: task.recursive ?? false,
      filter: task.filter,
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: `Copy failed: ${error}` };
  }
}

/**
 * Main postbuild function.
 */
export function postbuild(): PostbuildResult {
  const result: PostbuildResult = {
    success: true,
    copied: [],
    errors: [],
  };

  log('Starting postbuild...');

  // Verify tsdown produced the expected outputs first
  const missingOutputs = verifyBuildOutputs();
  if (missingOutputs.length > 0) {
    for (const missing of missingOutputs) {
      result.errors.push(`Missing build output: ${missing}`);
    }
    logError('tsdown build appears to have failed. Missing outputs:');
    for (const missing of missingOutputs) {
      logError(`  - ${missing}`);
    }
    result.success = false;
    return result;
  }

  // Gather all copy tasks
  const copyTasks = [...getHtmlFiles(), ...getWrapperTasks(), getDrizzleTask(), getProtoTask()];

  // Clean destinations to prevent stale files
  cleanDestinations(copyTasks);

  // Execute copy tasks
  for (const task of copyTasks) {
    const copyResult = executeCopyTask(task);
    if (copyResult.success) {
      const relativePath = task.dest.replace(ROOT, '.');
      result.copied.push(relativePath);
      log(`Copied: ${task.src.replace(ROOT, '.')} -> ${relativePath}`);
    } else {
      result.errors.push(copyResult.error!);
      logError(copyResult.error!);
      result.success = false;
    }
  }

  // Create ESM package.json marker for dist/
  const distSrcPackageJson = path.join(DIST, 'package.json');
  try {
    fs.writeFileSync(distSrcPackageJson, JSON.stringify({ type: 'module' }, null, 2) + '\n');
    log('Created: ./dist/package.json');
  } catch (error) {
    result.errors.push(`Failed to create ESM marker: ${error}`);
    logError(`Failed to create ESM marker: ${error}`);
    result.success = false;
  }

  // Make CLI executables (no-op on Windows, but doesn't hurt)
  const cliExecutables = ['entrypoint.js', 'main.js'];
  for (const executable of cliExecutables) {
    const execPath = path.join(DIST, executable);
    try {
      fs.chmodSync(execPath, 0o755);
      log(`Made executable: ./dist/${executable}`);
    } catch (error) {
      // chmod may fail on Windows - this is acceptable
      log(`Note: chmod failed (expected on Windows): ${error}`);
    }
  }

  if (result.success) {
    log(`Postbuild complete. Copied ${result.copied.length} items.`);
  } else {
    logError(`Postbuild failed with ${result.errors.length} error(s).`);
  }

  return result;
}

// Run if executed directly (not when imported for testing)
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  const result = postbuild();
  if (!result.success) {
    process.exit(1);
  }
}
