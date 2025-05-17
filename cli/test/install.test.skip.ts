import { test } from 'node:test';
import assert from 'assert';
import type { IImportMap } from '../src/types.ts';
import { run } from './scenarios.ts';

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

test('Basic install', async () => {
  await run({
    commands: ['jspm install -m importmap.json'],
    validationFn: async (files: Map<string, string>) => {
      assert.equal(files.size, 3);

      const map: IImportMap = JSON.parse(files.get('importmap.json')!);
      assert.strictEqual(
        map.scopes?.['./']?.react,
        'https://ga.jspm.io/npm:react@17.0.1/dev.index.js'
      );
    }
  });
});

test('Install with production environment', async () => {
  await run({
    commands: ['jspm install -m importmap.json -C production'],
    validationFn: async (files: Map<string, string>) => {
      assert.equal(files.size, 3);

      const map = JSON.parse(files.get('importmap.json')!);
      assert.strictEqual(map.imports.react, 'https://ga.jspm.io/npm:react@17.0.1/index.js');
    }
  });
});

test('Install with deno environment', async () => {
  await run({
    commands: ['jspm install -o importmap.json react@17.0.1 react-dom@17.0.1 -e deno'],
    validationFn: async (files: Map<string, string>) => {
      assert.equal(files.size, 3);

      const map = JSON.parse(files.get('importmap.json')!);
      assert.strictEqual(map.imports.react, 'https://ga.jspm.io/npm:react@17.0.1/dev.index.js');
    }
  });
});

test('Install with both deno and browser environments', async () => {
  await run({
    commands: ['jspm install -o importmap.json react@17.0.1 react-dom@17.0.1 -e deno,browser'],
    validationFn: async (files: Map<string, string>) => {
      assert.equal(files.size, 3);

      const map = JSON.parse(files.get('importmap.json')!);
      assert.strictEqual(map.imports.react, 'https://ga.jspm.io/npm:react@17.0.1/dev.index.js');
    }
  });
});

test('Install using an alias for the package', async () => {
  await run({
    commands: ['jspm install -o importmap.json -e production custom=react@17.0.1'],
    validationFn: async (files: Map<string, string>) => {
      assert.equal(files.size, 3);

      const map = JSON.parse(files.get('importmap.json')!);
      assert.strictEqual(map.imports.custom, 'https://ga.jspm.io/npm:react@17.0.1/index.js');
    }
  });
});

test('Reinstall, changing from development to production', async () => {
  await run({
    commands: [
      'jspm install -o importmap.json -e development react@17.0.1',
      'jspm install -o importmap.json -e production'
    ],
    validationFn: async (files: Map<string, string>) => {
      assert.equal(files.size, 3);

      const map = JSON.parse(files.get('importmap.json')!);
      assert(map.imports.react);
      assert(!map.imports.react.includes('dev'));
    }
  });
});

test("Installing should respect the existing import map's env field", async () => {
  await run({
    commands: [
      'jspm install -o importmap.json -e deno,production react@17.0.1',
      'jspm install -o importmap.json'
    ],
    validationFn: async (files: Map<string, string>) => {
      assert.equal(files.size, 3);

      const map = JSON.parse(files.get('importmap.json')!);
      assert(map.imports.react);
    }
  });
});

test('Swapping providers using the -p flag', async () => {
  await run({
    commands: ['jspm install -o importmap.json -p jsdelivr -e production,browser react@17.0.1'],
    validationFn: async (files: Map<string, string>) => {
      assert.equal(files.size, 3);

      const map = JSON.parse(files.get('importmap.json')!);
      assert.strictEqual(map.imports.react, 'https://cdn.jsdelivr.net/npm/react@17.0.1/index.js');
    }
  });
});

test('Using different output map with additive behavior', async () => {
  await run({
    commands: [
      'jspm install -o importmap.json -e production,browser react@17.0.1 lodash@4.17.21',
      'jspm install -e production,browser -o output.importmap.json lodash' // extract lodash
    ],
    validationFn: async (files: Map<string, string>) => {
      assert.equal(files.size, 4);
      assert(files.get('importmap.json')!);
      assert(files.get('output.importmap.json'));

      const map = JSON.parse(files.get('output.importmap.json')!);
      assert.strictEqual(map.imports.react, 'https://ga.jspm.io/npm:react@17.0.1/index.js');
      assert.strictEqual(map.imports.lodash, 'https://ga.jspm.io/npm:lodash@4.17.21/lodash.js');
    }
  });
});

test('Installing should always bump the version if possible', async () => {
  await run({
    commands: [
      'jspm install -o importmap.json react@17.0.1',
      'jspm install -o importmap.json react'
    ],
    validationFn: async (files: Map<string, string>) => {
      const map: IImportMap = JSON.parse(files.get('importmap.json')!);
      assert.notStrictEqual(
        map.imports?.react,
        'https://cdn.jsdelivr.net/npm/react@17.0.1/index.js'
      );
    }
  });
});

test('Linking with trailing slash should do subpath installs', async () => {
  await run({
    files: packageJsonWithExports,
    commands: ['jspm install ./ -o importmap.json'],
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
