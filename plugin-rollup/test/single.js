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
    assert.strictEqual(eval(code.replace(/export \{ (\w+) as default \}/, '$1')), path.resolve('dep'));
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
});
