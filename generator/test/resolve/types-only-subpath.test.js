import { Generator } from '@jspm/generator';
import assert from 'assert';

// A subpath exported only under conditions outside the environment (here a
// "types"-only subpath) never resolves, so subpaths: true must not enumerate it.
// Previously it was speculatively enumerated and its trace failure aborted the
// install of every sibling subpath.
// https://github.com/jspm/jspm/issues/2751

const isBrowser = typeof process === 'undefined' || !process.versions?.node;

if (!isBrowser) {
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'nodemodules'
  });

  await generator.install({
    alias: 'types-only',
    target: new URL('./types-only-subpath', import.meta.url).href,
    subpaths: true
  });

  const json = generator.getMap();
  assert.ok(json.imports['types-only'].endsWith('/index.js'), 'main subpath should resolve');
  assert.ok(
    json.imports['types-only/package.json'].endsWith('/package.json'),
    'package.json subpath should resolve'
  );
  assert.strictEqual(
    json.imports['types-only/types'],
    undefined,
    'types-only subpath must not be enumerated'
  );
}
