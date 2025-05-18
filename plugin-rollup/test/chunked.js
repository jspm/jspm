import assert from 'assert';
import fs from 'fs';
import * as rollup from 'rollup';
import jspmRollup from '@jspm/plugin-rollup';
import { fileURLToPath } from 'url';

const baseUrl = new URL('../', import.meta.url);
const fixturesUrl = new URL('./fixtures', import.meta.url);
const outFixturesUrl = new URL('./out', import.meta.url);
const outFixturesPath = fileURLToPath(outFixturesUrl);

suite('Syntax error messages', () => {
  test('Basic syntax error', async () => {
    try {
      await rollup.rollup({
        input: [`${fixturesUrl}/syntax-error.js`],
        plugins: [jspmRollup()]
      });
    } catch (err) {
      if (err.message.indexOf(`import a 'asdf`) === -1) assert(false);
      if (err.message.indexOf('^') === -1) assert(false);
    }
  });
});

suite('Dynamic import', () => {
  test('Dynamic import', async () => {
    const build = await rollup.rollup({
      onwarn() {},
      input: `${fixturesUrl}/dynamic-import.js`,
      plugins: [jspmRollup()]
    });
    const {
      output: [{ code, map }]
    } = await build.generate({ format: 'es' });
    assert.strictEqual(code.indexOf(`import('chalk')`), -1, 'Dynamic import must be remapped');
    assert.deepStrictEqual(
      build.cache.modules
        .map(module => module.id.slice(baseUrl.href.length))
        .sort()
        .filter(m => !m.startsWith('node_modules/@jspm/core/')),
      [
        '-string-regexp/index.js',
        'convert/conversions.js',
        'convert/index.js',
        'convert/route.js',
        'core/nodelibs/browser/assert.js',
        'core/nodelibs/browser/chunk-CkFCi-G1.js',
        'core/nodelibs/browser/chunk-DEMDiNwt.js',
        'core/nodelibs/browser/chunk-DtcTpLWz.js',
        'core/nodelibs/browser/process.js',
        'core/nodelibs/browser/util.js',
        'index.js',
        'index.js?entry',
        'name/index.js',
        'templates.js',
        'test/fixtures/dynamic-import.js',
        'ts-color/browser.js',
        'tyles/index.js'
      ].map(path => (path.endsWith('?dewexternal') ? path : path))
    );
  });
});

suite('Edge cases', () => {
  test.skip('@empty build', async () => {
    const bundle = await rollup.rollup({
      input: 'x',
      plugins: [jspmRollup({ baseUrl: fixturesUrl, inputMap: { imports: { x: '@empty' } } })]
    });
    await bundle.write({
      file: `${outFixturesPath}/x.js`,
      format: 'esm'
    });
    assert.strictEqual(fs.readFileSync(`${outFixturesPath}/x.js`).toString(), '\n');
  });
});

suite('Browser builds', () => {
  test('babel', async () => {
    const bundle = await rollup.rollup({
      onwarn() {},
      input: `${fixturesUrl}/babel.js`,
      plugins: [jspmRollup({ env: ['browser'] })]
    });
    bundle.write({
      file: `${outFixturesPath}/babel-browser.js`,
      format: 'cjs'
    });
    assert.ok(
      bundle.cache.modules.find(m => m.id.endsWith('@jspm/core/nodelibs/browser/process.js'))
    );
  });
});

suite('Node single file builds', () => {
  test.skip('babel', async () => {
    const chunk = await rollup.rollup({
      onwarn() {},
      input: `${fixturesUrl}/babel.js`,
      plugins: [jspmRollup({ env: ['node', 'production'] })]
    });

    await chunk.write({ format: 'esm', file: `${outFixturesPath}/babel.js` });

    // Mocha screws up dynamic import for some reason
    await import(`${outFixturesUrl}/babel.js`);
  });
});

suite('Chunked builds', () => {
  test('babel / lodash chunk', async () => {
    const bundle = await rollup.rollup({
      onwarn() {},
      input: [`${fixturesUrl}/babel.js`, `${fixturesUrl}/lodash.js`],
      plugins: [jspmRollup({ env: ['node'] })]
    });

    const {
      output: [babel, lodash]
    } = await bundle.write({ format: 'esm', dir: outFixturesPath });

    assert.strictEqual(Object.keys(babel.modules).length, 306);
    assert.strictEqual(Object.keys(lodash.modules).length, 138);

    // test we can execute (assertions in code)
    await import(`${outFixturesUrl}/babel.js`);
    await import(`${outFixturesUrl}/lodash.js`);
  });
});
