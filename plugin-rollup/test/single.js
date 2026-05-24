import * as rollup from 'rollup';
import jspmRollup from '@jspm/plugin-rollup';
import path from 'path';
import assert from 'assert';

suite('Basic Rollup', () => {
  const baseUrl = new URL('./fixtures/basic/', import.meta.url);

  test('Test', async () => {
    const bundle = await rollup.rollup({
      input: './main.js',
      plugins: [jspmRollup({ baseUrl, env: ['browser'] })]
    });
  
    const { output: [{ code, map: _map }] } = await bundle.generate({ format: 'esm' });
    assert.strictEqual(eval(code.replace(/export \{ ([a-zA-Z$0-9]+) as default \}/, '$1')), path.resolve('dep'));
  });

  test('Test minify', async () => {
    const bundle = await rollup.rollup({
      input: './main.js',
      plugins: [jspmRollup({ baseUrl, env: ['browser'], minify: true })]
    });
  
    const { output: [{ code, map: _map }] } = await bundle.generate({ format: 'esm' });
    assert.ok(code.length < 20000);
    assert.strictEqual(eval(code.replace(/export\{(\w+) as default\}/, '$1')), path.resolve('dep'));
  });

  test('Test TypeScript', async () => {
    const bundle = await rollup.rollup({
      input: './test.ts',
      plugins: [jspmRollup({ baseUrl, env: ['browser'] })]
    });

    const { output: [{ code, map: _map }] } = await bundle.generate({ format: 'esm' });
    assert.strictEqual(eval(code.replace(/export \{ (\w+) \}/, '$1')), 5);
  });

  test('Import attributes - inline', async () => {
    const bundle = await rollup.rollup({
      input: './import-attributes.js',
      plugins: [jspmRollup({ baseUrl, env: ['browser'] })]
    });

    const { output: [{ code }] } = await bundle.generate({ format: 'esm' });
    assert.ok(code.includes('CSSStyleSheet'), 'CSS should be inlined as CSSStyleSheet');
    assert.ok(code.includes('replaceSync'), 'CSS should use replaceSync');
    assert.ok(code.includes('color'), 'CSS content should be present');
    assert.ok(code.includes('"test"'), 'JSON data should be inlined');
    assert.ok(code.includes('42'), 'JSON values should be present');
  });

  test('Import attributes - external', async () => {
    const bundle = await rollup.rollup({
      input: './import-attributes.js',
      external: (id) => id.endsWith('.json') || id.endsWith('.css'),
      plugins: [jspmRollup({ baseUrl, env: ['browser'] })]
    });

    const { output: [{ code }] } = await bundle.generate({ format: 'esm' });
    assert.ok(!code.includes('CSSStyleSheet'), 'CSS should not be inlined when external');
    assert.ok(!code.includes('"test"'), 'JSON should not be inlined when external');
    assert.ok(code.includes('data.json'), 'JSON external import should be preserved');
    assert.ok(code.includes('styles.css'), 'CSS external import should be preserved');
  });
});
