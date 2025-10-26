import { test } from 'node:test';
import assert from 'assert';
import { run } from './scenarios.ts';

test('Support importmap.json when both exist', async () => {
  await run({
    files: new Map([
      [
        'importmap.json',
        JSON.stringify({
          imports: {
            jquery: 'https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js'
          }
        })
      ],
      ['importmap.js', `should not be loaded`]
    ]),
    commands: ['jspm link react -m importmap.json'],
    validationFn: async (files: Map<string, string>) => {
      assert(files.has('importmap.json'), 'importmap.json should exist');
      assert(files.has('importmap.js'), 'importmap.js should still exist');

      const jsContent = files.get('importmap.js')!;
      assert(jsContent === 'should not be loaded');

      const map = JSON.parse(files.get('importmap.json')!);
      assert(
        map.imports.react === 'https://cdn.jsdelivr.net/npm/react@19.2.0/index.js',
        'react should be preserved in importmap.js'
      );
      assert(!map.imports.jquery, 'jquery should be pruned from importmap.js');
    }
  });
});
