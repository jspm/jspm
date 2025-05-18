import { test } from 'node:test';
import assert from 'assert';
import type { IImportMap } from '../src/types.ts';
import { run } from './scenarios.ts';

// Create package.json with exports including pattern subpaths
const packageJsonWithExportPatterns = new Map([
  [
    'package.json',
    JSON.stringify({
      name: 'test-package',
      version: '1.0.0',
      exports: {
        '.': './index.js',
        './utils': './utils.js',
        './components/*': './src/components/*',
        './styles/*.css': './assets/css/*.css',
        './lib/*': {
          custom: './lib/custom/*.js',
          import: './lib/esm/*.js'
        }
      }
    })
  ],
  ['importmap.json', '{}'],
  ['index.js', 'export default function main() {}'],
  ['utils.js', 'export function utility() {}'],
  ['src/components/button.js', 'export function Button() {}'],
  ['src/components/input.js', 'export function Input() {}'],
  ['assets/css/main.css', '/* Main CSS */'],
  ['assets/css/theme.css', '/* Theme CSS */'],
  ['lib/esm/math.js', 'export const add = (a, b) => a + b;'],
  ['lib/esm/string.js', 'export const concat = (a, b) => a + b;'],
  ['lib/custom/math.js', 'exports.add = (a, b) => a + b;'],
  ['lib/custom/string.js', 'exports.concat = (a, b) => a + b;']
]);

test('Install with exports field subpath patterns', async () => {
  await run({
    files: packageJsonWithExportPatterns,
    commands: ['jspm install -o importmap.json'],
    validationFn: async (files: Map<string, string>) => {
      const map = JSON.parse(files.get('importmap.json')!) as IImportMap;

      // Base package and simple subpaths
      assert(map.imports!['test-package']);
      assert(map.imports!['test-package/utils']);

      // Component pattern subpaths
      assert(map.imports!['test-package/components/button.js']);
      assert(map.imports!['test-package/components/input.js']);
      assert.strictEqual(
        map.imports!['test-package/components/button.js'],
        './src/components/button.js'
      );
      assert.strictEqual(
        map.imports!['test-package/components/input.js'],
        './src/components/input.js'
      );

      // CSS pattern subpaths with extension
      assert(map.imports!['test-package/styles/main.css']);
      assert(map.imports!['test-package/styles/theme.css']);
      assert.strictEqual(map.imports!['test-package/styles/main.css'], './assets/css/main.css');
      assert.strictEqual(map.imports!['test-package/styles/theme.css'], './assets/css/theme.css');

      // Conditional exports with patterns
      assert(map.imports!['test-package/lib/math']);
      assert(map.imports!['test-package/lib/string']);
      // Default import condition should be used
      assert.strictEqual(map.imports!['test-package/lib/math'], './lib/esm/math.js');
      assert.strictEqual(map.imports!['test-package/lib/string'], './lib/esm/string.js');
    }
  });
});

test("Install with exports field subpath patterns and 'custom' condition", async () => {
  await run({
    files: packageJsonWithExportPatterns,
    commands: ['jspm install -o importmap.json --conditions=custom'],
    validationFn: async (files: Map<string, string>) => {
      const map = JSON.parse(files.get('importmap.json')!) as IImportMap;

      // Conditional exports should use custom condition
      assert(map.imports!['test-package/lib/math']);
      assert(map.imports!['test-package/lib/string']);
      assert.strictEqual(map.imports!['test-package/lib/math'], './lib/custom/math.js');
      assert.strictEqual(map.imports!['test-package/lib/string'], './lib/custom/string.js');
    }
  });
});
