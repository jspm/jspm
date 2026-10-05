import { Generator } from '@jspm/generator';
import assert from 'assert';

if (typeof document === 'undefined') {
  const analyses = {};
  for (const entry of ['./mixedcjs/cjs.js', './mixedcjs/esm.js', './mixedcjs/export-empty.js']) {
    const generator = new Generator({
      mapUrl: import.meta.url,
      defaultProvider: 'nodemodules',
      commonJS: true
    });
    await generator.link(entry);
    analyses[entry] = {
      map: generator.getMap(),
      ...generator.getAnalysis(new URL(entry, import.meta.url))
    };
  }

  assert.strictEqual(analyses['./mixedcjs/cjs.js'].format, 'commonjs');
  assert.strictEqual(
    analyses['./mixedcjs/cjs.js'].map.imports.dep,
    './mixedcjs/node_modules/dep/index.js'
  );

  // require() calls are traced alongside module syntax
  assert.strictEqual(analyses['./mixedcjs/esm.js'].format, 'esm');
  assert.deepStrictEqual(analyses['./mixedcjs/esm.js'].staticDeps, ['./shim.js', 'dep']);
  assert.strictEqual(
    analyses['./mixedcjs/esm.js'].map.imports.dep,
    './mixedcjs/node_modules/dep/index.js'
  );

  // export {} alone is module syntax
  assert.strictEqual(analyses['./mixedcjs/export-empty.js'].format, 'esm');
}
