import { test } from 'node:test';
import assert from 'assert';
import type { IImportMap } from '../src/types.ts';
import { mapDirectory, run } from './scenarios.ts';

test('Basic install', async () => {
  await run({
    commands: ['jspm install -m importmap.json'],
    files: packageJsonWithExports,

    validationFn: async (files: Map<string, string>) => {
      assert.equal(files.size, 6);

      const map: IImportMap = JSON.parse(files.get('importmap.json')!);
      assert.strictEqual(
        map.scopes?.['./']?.react,
        'https://ga.jspm.io/npm:react@17.0.1/dev.index.js'
      );
    }
  });
});

test('Linking with no arguments should use package.json exports', async () => {
  await run({
    files: packageJsonWithExports,
    commands: ['jspm install -o importmap.json'],
    validationFn: async (files: Map<string, string>) => {
      const map = JSON.parse(files.get('importmap.json')!);

      // Should have linked all exports from package.json
      assert(map.imports['test-package']);
      assert(map.imports['test-package/utils']);
      assert(map.imports['test-package/helpers']);

      // Check that paths are correct
      assert.strictEqual(map.imports['test-package'], './index.js');
      assert.strictEqual(map.imports['test-package/utils'], './utils.js');
      assert.strictEqual(map.imports['test-package/helpers'], './helpers/index.js');
    }
  });
});

test('Local install', async () => {
  const files = await mapDirectory('fixtures/scenario_local');
  await run({
    commands: ['jspm install -m importmap.json -p jsdelivr'],
    files,
    cwd: 'pkg2',
    validationFn: async (files: Map<string, string>) => {
      const map: IImportMap = JSON.parse(files.get('pkg2/importmap.json')!);
      assert.ok(map.scopes?.['https://cdn.jsdelivr.net/npm/lit-element@4.2.1/']);
      assert.ok(map.scopes?.['https://cdn.jsdelivr.net/npm/lit@3.3.1/']);
    }
  });
});

// Create package.json with exports
const packageJsonWithExports = new Map([
  [
    'package.json',
    JSON.stringify({
      name: 'test-package',
      version: '1.0.0',
      exports: {
        '.': './index.js',
        './utils': './utils.js',
        './helpers': './helpers/index.js'
      },
      dependencies: {
        react: '17.0.1',
        'react-dom': '17.0.1'
      }
    })
  ],
  ['importmap.json', '{}'],
  ['index.js', "import 'react'; export default function main() {}"],
  ['utils.js', "import 'react-dom'; export function utility() {}"],
  ['helpers/index.js', 'export function helper() {}']
]);
