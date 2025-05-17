import { test } from 'node:test';
import assert from 'assert';
import { mapFile, run } from './scenarios.ts';

const importMap = await mapFile('fixtures/importmap.js');
const packageJson = await mapFile('fixtures/package.json');

test('Basic upgrade to latest react version', async () => {
  await run({
    files: importMap,
    commands: ['jspm update react -o importmap.json'],
    validationFn: async (files: Map<string, string>) => {
      const map = JSON.parse(files.get('importmap.json')!);
      assert(map.imports.react);
      assert.notStrictEqual(map.imports.react, 'https://ga.jspm.io/npm:react@17.0.1/dev.index.js');
    }
  });
});

test('Basic upgrade without parameters should upgrade all', async () => {
  await run({
    files: importMap,
    commands: ['jspm update -o importmap.json'],
    validationFn: async (files: Map<string, string>) => {
      const map = JSON.parse(files.get('importmap.json')!);
      assert(map.imports.react);
      assert.notStrictEqual(map.imports.react, 'https://ga.jspm.io/npm:react@17.0.1/dev.index.js');
    }
  });
});

test('Upgrade should use version from package.json', async () => {
  await run({
    files: new Map([...importMap, ...packageJson]),
    commands: ['jspm update react -C development -o importmap.json'],
    validationFn: async (files: Map<string, string>) => {
      const map = JSON.parse(files.get('importmap.json')!);
      assert(map.imports.react);
      assert.strictEqual(map.imports.react, 'https://ga.jspm.io/npm:react@18.1.0/dev.index.js');
    }
  });
});
