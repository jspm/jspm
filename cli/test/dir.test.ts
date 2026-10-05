import assert from 'node:assert';
import { it } from 'node:test';
import { run } from './scenarios.ts';

it('install with --dir uses the package in that directory', async () => {
  const files = new Map();
  files.set(
    'sub/package.json',
    JSON.stringify({
      name: 'dir-test',
      version: '1.0.0',
      exports: './index.js',
      dependencies: { 'es-module-lexer': '^1.7.0' }
    })
  );
  files.set('sub/index.js', "import 'es-module-lexer';");

  await run({
    files,
    commands: ['jspm install -d sub'],
    validationFn: async files => {
      const map = files.get('sub/importmap.js');
      assert(map, 'importmap.js should be written into the --dir directory');
      assert(
        map.includes('es-module-lexer@1.'),
        'install should resolve the --dir package dependencies'
      );
      assert(
        !files.has('importmap.js'),
        'no import map should be written to the working directory'
      );
    }
  });
});
