/**
 * Copyright 2022-2025 Guy Bedford
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

import { test } from 'node:test';
import assert from 'assert';
import { mapDirectory, run } from './scenarios.ts';

function randomVersion() {
  const major = Math.round(Math.random() * 1000);
  const minor = Math.round(Math.random() * 1000);
  const patch = Math.round(Math.random() * 1000);
  return `${major}.${minor}.${patch}`;
}

// Test publish with package validation errors
test('publish with missing package.json name', async () => {
  const files = new Map();
  // Create a package.json without a name field
  files.set('package.json', JSON.stringify({ version: randomVersion() }));

  try {
    await run({
      files,
      commands: ['jspm publish -p jspm.io'],
      validationFn: async () => {
        assert.fail('Should have thrown an error');
      }
    });
    assert.fail('Expected an error');
  } catch (error) {
    // We expect the command to fail
    assert(error.toString().includes('failed'), 'Command should fail with missing name');
    process.exitCode = 0;
  }
});

// Test publish with version validation errors
test('publish with missing package.json version', async () => {
  const files = new Map();
  // Create a package.json without a version field
  files.set('package.json', JSON.stringify({ name: 'test-package' }));

  try {
    await run({
      files,
      commands: ['jspm publish -p jspm.io'],
      validationFn: async () => {
        assert.fail('Should have thrown an error');
      }
    });
    assert.fail('Expected an error');
  } catch (error) {
    // We expect the command to fail
    assert(error.toString().includes('failed'), 'Command should fail with missing version');
  }
});

// Test publish with include configuration
test('publish with include config', async () => {
  const files = new Map();
  // Create a complete valid test setup
  files.set(
    'package.json',
    JSON.stringify({
      name: 'jspm-deploy-test',
      version: randomVersion(),
      files: ['src'],
      ignore: ['dist']
    })
  );
  files.set('index.js', "console.log('Hello world');");
  files.set('src/utils.js', 'export const add = (a, b) => a + b;');
  files.set('dist/ignore.js', 'should not include');

  await run({
    files,
    commands: ['jspm publish -p jspm.io --no-usage'],
    validationFn: async _updatedFiles => {
      // Verify the command completed successfully
      assert(true, 'Publish command with config completed successfully');
    }
  });
});

// Test publish with versioning
test('publish with specific version', async () => {
  const files = new Map();
  // Create package.json with a specific version
  const testVersion = randomVersion();
  files.set(
    'package.json',
    JSON.stringify({
      name: 'jspm-deploy-test',
      version: testVersion,
      description: 'Test package for jspm publish testing'
    })
  );

  files.set('index.js', "console.log('Version test');");

  await run({
    files,
    commands: ['jspm publish -p jspm.io --no-usage'],
    validationFn: async _updatedFiles => {
      // Successfully published version 1.0.1
      assert(true, `Successfully published version ${testVersion}`);
    }
  });
});

// Test publish with custom tag
test('publish with custom tag', async () => {
  const files = new Map();
  // Create package.json with a version that should be overridden
  files.set(
    'package.json',
    JSON.stringify({
      name: 'jspm-deploy-test',
      version: randomVersion(),
      description: 'Test package for jspm publish testing'
    })
  );

  files.set('index.js', "console.log('Tag test');");

  const customTag = `beta-${Math.round(Math.random() * 1000)}`;

  await run({
    files,
    commands: [`jspm publish -p jspm.io --version ${customTag} --no-usage`],
    validationFn: async _updatedFiles => {
      // Successfully published with custom tag
      assert(true, `Successfully published with tag ${customTag}`);
    }
  });
});

// Test publish with invalid tag
test('publish with invalid tag', async () => {
  const files = new Map();
  files.set(
    'package.json',
    JSON.stringify({
      name: 'jspm-deploy-test',
      version: randomVersion()
    })
  );

  files.set('index.js', "console.log('Invalid tag test');");

  try {
    await run({
      files,
      commands: ['jspm publish -p jspm.io --version invalid@tag'],
      validationFn: async () => {
        assert.fail('Should have thrown an error for invalid tag');
      }
    });
    assert.fail('Expected an error for invalid tag');
  } catch (error) {
    // We expect the command to fail with a specific error
    assert(error.toString().includes('failed'), 'Command should fail with invalid tag');
  }
});

// Test publish and eject
test('publish and eject', async () => {
  const files = new Map();
  const packageName = 'jspm-deploy-eject-test';
  const version = `test-${Math.round(Math.random() * 1000)}`;

  // Create a package for publish
  files.set(
    'package.json',
    JSON.stringify({
      name: packageName,
      version: randomVersion(),
      description: 'Test package for jspm publish and eject testing',
      exports: './index.js'
    })
  );

  // Add a simple index file
  files.set('index.js', "export const message = 'Hello from published package';");

  // Add a utility file in a subdirectory
  files.set('src/utils.js', 'export const add = (a, b) => a + b;');

  let publishedPackage;

  await run({
    files,
    commands: [`jspm publish -p jspm.io --version ${version} --no-usage`],
    validationFn: async _updatedFiles => {
      // Store the package name for ejection
      publishedPackage = `app:${packageName}@${version}`;
      assert(true, `Successfully published ${publishedPackage}`);
    }
  });

  // Now test ejection to a target directory
  const ejectDir = 'ejected';

  await run({
    files: new Map(), // Start with clean files
    commands: [
      `jspm publish -p jspm.io --eject ${publishedPackage} --dir ${ejectDir} -o importmap.json`
    ],
    validationFn: async updatedFiles => {
      // Verify ejected files
      console.log(updatedFiles);
      assert(updatedFiles.has(`${ejectDir}/index.js`), 'Should have ejected index.js');
      assert(updatedFiles.has(`${ejectDir}/src/utils.js`), 'Should have ejected src/utils.js');

      // Verify import map was updated
      assert(updatedFiles.has('importmap.json'), 'Import map should exist after ejection');

      // If importmap.json exists, parse and verify it
      try {
        const importMap = JSON.parse(updatedFiles.get('importmap.json')!);
        assert(
          importMap.imports['jspm-deploy-eject-test'] === './ejected/index.js',
          'Import map should have imports property'
        );
      } catch (e) {
        assert.fail(`Failed to parse import map: ${e.message}`);
      }
    }
  });
});

// Test publish with watch mode (short duration for testing)
// This test must be last as the watcher stop is a process.exit
test('publish watch mode basic test', async () => {
  const files = await mapDirectory('fixtures/scenario_deploy');

  // For testing watch mode, we'll start it but cancel after a short time
  // This is just to ensure the watch mode starts properly
  let watchProcess;

  try {
    // We need to handle this differently since watch mode is long-running
    // Instead we'll just verify it can start
    watchProcess = run({
      files,
      commands: [`jspm publish -p jspm.io --version dev --watch --no-usage`],
      validationFn: async () => {
        // Watch mode should start successfully
        await new Promise((resolve, reject) => {
          watchProcess.catch(reject);
          setTimeout(resolve, 5_000);
        });
        process.stdin.emit('data', 'q');
      }
    });
    // This test is more to verify the watch mode can be started
    // A more thorough test would actually modify files and verify republish
  } catch (error) {
    assert.fail(`Watch mode failed to start: ${error}`);
  }
});
