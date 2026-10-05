import { Generator } from '@jspm/generator';
import assert from 'assert';

// A null target is terminal, as in Node.js: a matched condition mapping to
// null means the subpath is not exported in that environment, rather than
// falling through to later conditions.

const isBrowser = typeof process === 'undefined' || !process.versions?.node;

if (!isBrowser) {
  const target = new URL('./null-target', import.meta.url).href;

  const browserGenerator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'nodemodules'
  });
  await assert.rejects(
    browserGenerator.install({ alias: 'null-target', target, subpath: './node-only' }),
    /No '\.\/node-only' exports subpath defined/
  );

  await browserGenerator.install({ alias: 'null-target', target, subpaths: true });
  assert.deepStrictEqual(Object.keys(browserGenerator.getMap().imports), ['null-target']);

  const nodeGenerator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'nodemodules',
    env: ['node', 'development', 'module']
  });
  await nodeGenerator.install({ alias: 'null-target', target, subpath: './node-only' });
  assert.ok(nodeGenerator.getMap().imports['null-target/node-only'].endsWith('/node-only.js'));
}
