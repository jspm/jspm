import assert from 'node:assert';
import { it } from 'node:test';
import { mapDirectory, run } from './scenarios.ts';

const filesRoot = await mapDirectory('fixtures/scenario_roots');

it('rootURL = /, mapURL = /importmap.json', async () => {
  await run({
    files: filesRoot,
    commands: ['jspm install roots -o importmap.json'],
    validationFn: async (files: Map<string, string>) => {
      const map = JSON.parse(files.get('importmap.json')!);
      assert.strictEqual(map.imports.roots, './a/b/index.js');
      assert(map.scopes['./']); // scoping root is the map URL
    }
  });
});

it('rootURL = /, mapURL = /a/importmap.json', async () => {
  await run({
    files: filesRoot,
    commands: ['jspm install roots -o a/importmap.json --root .'],
    validationFn: async (files: Map<string, string>) => {
      const map = JSON.parse(files.get('a/importmap.json')!);
      assert.strictEqual(map.imports.roots, '/a/b/index.js'); // rooted URL
      assert(map.scopes['/']); // root package scope equals the root URL
    }
  });
});

it('rootURL = /a, mapURL = /a/importmap.json', async () => {
  await run({
    files: filesRoot,
    commands: ['jspm install roots -o a/importmap.json --root a'],
    validationFn: async (files: Map<string, string>) => {
      const map = JSON.parse(files.get('a/importmap.json')!);
      assert.strictEqual(map.imports.roots, '/b/index.js'); // rooted URL
      assert(map.scopes['/../']); // root packager scope is behind the root URL
      // ^ an odd edge case, we might want to map the scope to "/" like the
      //   browser does if you visit something like "http://root.com/../".
    }
  });
});

it('rootURL = /a/b, mapURL = /a/importmap.json', async () => {
  await run({
    files: filesRoot,
    commands: ['jspm install roots -o a/importmap.json --root a/b'],
    validationFn: async (files: Map<string, string>) => {
      const map = JSON.parse(files.get('a/importmap.json')!);
      assert.strictEqual(map.imports.roots, '/index.js'); // rooted URL
      assert(map.scopes['/../../']); // root packager scope is behind the root URL
      // ^ an odd edge case, we might want to map the scope to "/" like the
      //   browser does if you visit something like "http://root.com/../".
    }
  });
});
