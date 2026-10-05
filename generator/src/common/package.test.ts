import { expandExportsResolutions, getWildcardPrefixes } from './package.js';
import assert from 'node:assert';

// Helper to convert Set to sorted array for assertion
const setToArray = set => Array.from(set).sort();

// expandExportsResolutions must agree exactly with Resolver.resolvePackageTarget,
// which is strict Node conditional resolution. Unknown conditions never resolve
// and so are never enumerated.
const browserEnv = ['browser', 'development', 'module', 'import', 'default'];

// Test: unknown condition ordered before "default" must not shadow it
{
  const resolutions = new Map<string, string>();
  expandExportsResolutions(
    { '.': { worker: './w.js', default: './d.js' } },
    browserEnv,
    new Set(['w.js', 'd.js']),
    resolutions
  );
  assert.deepEqual([...resolutions], [['.', 'd.js']]);
}

// Test: unknown condition ordered before an env condition must not shadow it
{
  const resolutions = new Map<string, string>();
  expandExportsResolutions(
    { '.': { worker: './w.js', browser: './b.js' } },
    browserEnv,
    new Set(['w.js', 'b.js']),
    resolutions
  );
  assert.deepEqual([...resolutions], [['.', 'b.js']]);
}

// Test: a target reachable only through unknown conditions is not enumerated,
// since the resolver would refuse it
{
  const resolutions = new Map<string, string>();
  expandExportsResolutions(
    { '.': { worker: './w.js' } },
    browserEnv,
    new Set(['w.js']),
    resolutions
  );
  assert.deepEqual([...resolutions], []);
}

// Test: a "types"-only subpath alongside resolvable siblings — jspm/jspm#2751
{
  const resolutions = new Map<string, string>();
  expandExportsResolutions(
    {
      '.': {
        require: { types: './index.d.cts', default: './index.cjs' },
        import: { types: './index.d.ts', default: './index.js' }
      },
      './types': {
        require: { types: './types.d.cts' },
        import: { types: './types.d.ts' }
      },
      './package.json': './package.json'
    },
    browserEnv,
    new Set([
      'index.js',
      'index.cjs',
      'index.d.ts',
      'index.d.cts',
      'types.d.ts',
      'types.d.cts',
      'package.json'
    ]),
    resolutions
  );
  assert.deepEqual(
    [...resolutions],
    [
      ['.', 'index.js'],
      ['./package.json', 'package.json']
    ]
  );
}

// Test: a null target is terminal, as in Node.js, rather than falling through
// to "default"
{
  const resolutions = new Map<string, string>();
  expandExportsResolutions(
    { '.': './index.js', './node-only': { browser: null, default: './node-only.js' } },
    browserEnv,
    new Set(['index.js', 'node-only.js']),
    resolutions
  );
  assert.deepEqual([...resolutions], [['.', 'index.js']]);
}

// Test: "types" wildcard must not shadow "default" — jspm/jspm#2717
{
  const resolutions = new Map<string, string>();
  expandExportsResolutions(
    {
      './src/*': { import: { types: './types/src/*', default: './src/*' } },
      './dist/*': './dist/*'
    },
    browserEnv,
    new Set([
      'src/util.js',
      'src/index.js',
      'types/src/util.d.ts',
      'types/src/index.d.ts',
      'dist/color.js'
    ]),
    resolutions
  );
  assert.deepEqual(setToArray(resolutions.keys()), [
    './dist/color.js',
    './src/index.js',
    './src/util.js'
  ]);
  assert.strictEqual(resolutions.get('./src/util.js'), 'src/util.js');
}

// Test: wildcard prefixes are derived from the resolved target, not a
// speculative one — the suffix safety check must scan the real directory
{
  const prefixes = getWildcardPrefixes(
    { './src/*.js': { import: { types: './types/*.d.ts', default: './src/*.js' } } },
    browserEnv,
    new Set(['src/util.js', 'src/index.js', 'types/util.d.ts'])
  );
  assert.deepEqual([...prefixes], ['./src/']);
}

console.log('All tests passed! ✨');
