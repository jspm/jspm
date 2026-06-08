import { Generator } from '@jspm/generator';
import assert from 'assert';

// getCache() supports skipping cache entries by URL base:
//   packageConfigSkips - omit package configs and package bases (but keep
//     module analysis) for providers whose getPackageConfig is dynamic, so a
//     stale config snapshot can't pin package boundaries on later runs.
//   moduleSkips - omit module analysis for the given bases.

const HOST = 'https://framerusercontent.dev/modules/';
const localUrl = `${HOST}local-project-id/local-save-id/LocalComponent.js`;
const three178 = 'https://ga.jspm.io/npm:three@0.178.0/build/three.module.js';
const threePcfg = {
  name: 'three',
  version: '0.178.0',
  type: 'module',
  main: './build/three.module.js',
  exports: {
    '.': { import: './build/three.module.js' },
    './build/three.module.js': './build/three.module.js'
  }
};

const generator = new Generator({
  mapUrl: 'about:blank',
  inputMap: {
    imports: {},
    scopes: {
      [`${HOST}local-project-id/`]: {
        '#framer/local/codeFile/LocalComponent.js': localUrl,
        three: three178
      }
    }
  },
  env: ['production', 'browser', 'module'],
  defaultProvider: 'jspm.io',
  flattenScopes: false,
  combineSubpaths: false,
  scopedLink: true,
  customProviders: {
    framer: {
      ownsUrl(url) {
        return url.startsWith(HOST);
      },
      // Dynamic: deep save-id dirs of local modules are not package boundaries.
      getPackageConfig(url) {
        if (!url.startsWith(HOST)) return {};
        const [moduleId, saveId, file] = url.slice(HOST.length).split('/');
        if (moduleId === 'local-project-id' && file !== undefined && saveId !== undefined)
          return null;
        return { dependencies: {} };
      }
    }
  },
  traceCache: {
    packageConfigs: { 'https://ga.jspm.io/npm:three@0.178.0/': threePcfg },
    analysis: {
      [localUrl]: {
        deps: ['three'],
        dynamicDeps: [],
        size: 32,
        integrity: '',
        format: 'esm',
        wasCjs: false
      },
      [three178]: {
        deps: [],
        dynamicDeps: [],
        size: 10,
        integrity: '',
        format: 'esm',
        wasCjs: false
      }
    },
    packageBases: { [three178]: 'https://ga.jspm.io/npm:three@0.178.0/' }
  }
});

await generator.link([localUrl]);

const framerKeys = obj => Object.keys(obj || {}).filter(url => url.startsWith(HOST));

// No skips: framer configs, bases and analysis are all cached.
{
  const cache = generator.getCache();
  assert.ok(framerKeys(cache.packageConfigs).length > 0, 'framer configs cached by default');
  assert.ok(framerKeys(cache.packageBases).length > 0, 'framer bases cached by default');
  assert.ok(framerKeys(cache.analysis).length > 0, 'framer analysis cached by default');
}

// packageConfigSkips: framer configs and bases dropped, analysis retained.
{
  const cache = generator.getCache({ packageConfigSkips: [HOST] });
  assert.strictEqual(framerKeys(cache.packageConfigs).length, 0, 'framer configs skipped');
  assert.strictEqual(framerKeys(cache.packageBases).length, 0, 'framer bases skipped');
  assert.ok(framerKeys(cache.analysis).length > 0, 'framer analysis retained');
  // Non-framer entries are unaffected.
  assert.ok(cache.packageConfigs['https://ga.jspm.io/npm:three@0.178.0/'], 'three config kept');
}

// moduleSkips: framer analysis dropped, configs and bases retained.
{
  const cache = generator.getCache({ moduleSkips: [HOST] });
  assert.strictEqual(framerKeys(cache.analysis).length, 0, 'framer analysis skipped');
  assert.ok(framerKeys(cache.packageConfigs).length > 0, 'framer configs retained');
  assert.ok(framerKeys(cache.packageBases).length > 0, 'framer bases retained');
}
