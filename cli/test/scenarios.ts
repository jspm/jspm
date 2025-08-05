import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { cli } from '../src/cli.ts';
import { loadConfig } from '../src/config.ts';

const defaultPackageJson = {
  name: 'test',
  version: '1.0.0',
  dependencies: {}
};

export type Files = Map<string, string>;
export interface Scenario {
  commands: `jspm ${string}`[];
  validationFn?: (files: Files) => Promise<void>;
  expectError?: true;

  // For configuring initial environment for the scenario:
  files?: Files;
  // Subdirectory within the temp dir to use as working directory
  cwd?: string;
}

export async function run(scenario: Scenario) {
  if (process.env.JSPM_TEST_LOG) {
    console.log(`running scenario "${scenario.commands[0]}"`);
  }

  const userConfig = await loadConfig('user');

  const originalCwd = process.cwd();
  const dir = await createTmpPkg(scenario);

  // Set working directory, considering the cwd option if provided
  const workingDir = scenario.cwd ? path.join(dir, scenario.cwd) : dir;

  // Ensure the working directory exists
  if (scenario.cwd) {
    await fs.mkdir(workingDir, { recursive: true });
  }

  process.chdir(workingDir);

  // Create isolated environment for tests
  const originalUserConfig = process.env.JSPM_USER_CONFIG_DIR;

  // Create isolated user config directory for tests
  const isolatedConfigDir = path.join(dir, '.jspm-user-config');
  await fs.mkdir(isolatedConfigDir, { recursive: true });
  process.env.JSPM_USER_CONFIG_DIR = isolatedConfigDir;

  // Get the content of the original .jspmrc from fixtures
  const originalContent = scenario.files?.get('.jspmrc') ?? '{}';

  const config = JSON.stringify({
    ...userConfig,
    ...JSON.parse(originalContent)
  });

  // Create a copy in the temp directory
  const configPath = path.join(dir, '.jspmrc');
  await fs.writeFile(configPath, config);

  try {
    for (const cmd of scenario.commands) {
      const args = ['node', ...cmd.split(' '), '--quiet'];
      cli.parse(args, { run: false });
      if (!(await cli.runMatchedCommand())) {
        throw new Error('Command failed');
      }
    }

    if (!scenario.validationFn) {
      if (scenario.expectError) throw new Error(`Scenario "${scenario.commands}" expected test to fail`);
      throw new Error(`Scenario "${scenario.commands}" has no validation function for test`);
    }
    await scenario.validationFn(await mapDirectory(dir));
  } catch (err) {
    if (scenario.expectError) {
      process.exitCode = 0;
      return;
    }
    throw new Error(`Scenario "${scenario.commands}" failed.`, {
      cause: err
    });
  } finally {
    // Restore original environment
    process.chdir(originalCwd);
    if (originalUserConfig !== undefined) {
      process.env.JSPM_USER_CONFIG_DIR = originalUserConfig;
    } else {
      delete process.env.JSPM_USER_CONFIG_DIR;
    }
    await deleteTmpPkg(dir);
  }
}

export async function mapDirectory(dir: string): Promise<Files> {
  dir = path.resolve(fileURLToPath(import.meta.url), '..', dir);
  const files = new Map<string, string>();
  for (const file of await fs.readdir(dir)) {
    const filePath = path.join(dir, file);
    if ((await fs.stat(filePath)).isFile()) {
      const data = await fs.readFile(filePath, 'utf-8');
      files.set(file, data);
    } else {
      const subFiles = await mapDirectory(filePath);
      for (const [subFile, subData] of subFiles) {
        files.set(path.join(file, subFile).replace(/\\/g, '/'), subData);
      }
    }
  }
  return files;
}

export async function mapFile(files: string | string[]): Promise<Files> {
  if (typeof files === 'string') return mapFile([files]);
  files = files.map(file => path.resolve(fileURLToPath(import.meta.url), '..', file));
  const res = new Map<string, string>();
  for (const file of files) {
    const data = await fs.readFile(file, 'utf-8');
    res.set(path.basename(file).replace(/\\/g, '/'), data);
  }
  return res;
}

async function createTmpPkg(scenario: Scenario): Promise<string> {
  // Inject a simple package.json if one doesn't already exist:
  if (!scenario.files?.has('package.json')) {
    if (!scenario.files) scenario.files = new Map();
    scenario.files.set('package.json', JSON.stringify(defaultPackageJson));
  }

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'jspm-'));
  for (const [file, content] of scenario.files || []) {
    const dirPath = path.join(dir, path.dirname(file));
    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(path.join(dir, file), content);
  }

  return dir;
}

async function deleteTmpPkg(dir: string) {
  if (dir.startsWith(os.tmpdir())) {
    // ensure it's a tmp dir
    while (true) {
      try {
        await fs.rm(dir, { recursive: true });
        return;
      } catch (err) {
        if (err.code === 'EBUSY') await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  } else {
    throw new Error(`Cannot delete ${dir} as it is not a temporary directory.`);
  }
}
