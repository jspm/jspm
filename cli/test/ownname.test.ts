import { test } from 'node:test';
import assert from 'assert';
import { mapDirectory, run } from './scenarios.ts';

const filesOwnName = await mapDirectory('fixtures/scenario_ownname');

test('Linking own-name package should not upgrade transitive dependencies', async () => {
  await run({
    files: filesOwnName,
    commands: ['jspm link app -o importmap.json'],
    validationFn: async (files: Map<string, string>) => {
      // Linking the own-name package "app" should not result in the version of
      // es-module-lexer in the import map being upgraded to 1.6.0, since it's a
      // transitive dependency of "./app.js".
      const map = JSON.parse(files.get('importmap.json')!);
      assert(map?.scopes?.['./']?.['es-module-lexer']?.includes('es-module-lexer@0.10.5'));
    }
  });
});

test('Linking local module should respect input map versions', async () => {
  await run({
    files: filesOwnName,
    commands: ['jspm link ./app.js -o outputmap.json'],
    validationFn: async (files: Map<string, string>) => {
      // Tracing the local module ./app.js should result in a top-level import
      // of es-module-lexer@0.10.5, as that is the version in the input map,
      // even though the package.json has a version constraint of ^1. This is
      // because we treat the input map as a lockfile:
      const map = JSON.parse(files.get('outputmap.json')!);
      assert(map?.imports?.['es-module-lexer']?.includes('es-module-lexer@0.10.5'));
    }
  });
});

test('Linking own-name package should respect input map versions', async () => {
  await run({
    files: filesOwnName,
    commands: ['jspm link app -o outputmap.json'],
    validationFn: async (files: Map<string, string>) => {
      // If we trace the own-name package "app" instead, we should get the same
      // result, as the package.json has an export for "app" -> "./app.js":
      const map = JSON.parse(files.get('outputmap.json')!);

      // TODO: once we fully implement re-entrant primary scope in the generator
      // we should be able to check map.imports rather:
      assert(map?.scopes?.['./']?.['es-module-lexer']?.includes('es-module-lexer@0.10.5'));
    }
  });
});
