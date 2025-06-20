import { Generator } from '@jspm/generator';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const generator = new Generator();
await generator.install('react');
await generator.install('dayjs');
await generator.install('rxjs');
await generator.install('@angular/core');
await generator.install('vue');

const map = await generator.downloadAll('./test/fixtures/deps');
assert.deepEqual(map.toJSON(), {
  imports: {
    react: './npm:react@19.1.0/dev.index.js',
    dayjs: './npm:dayjs@1.11.13/dayjs.min.js',
    rxjs: './npm:rxjs@7.8.2/dist/esm5/index.js',
    '@angular/core': './npm:@angular/core@20.0.4/fesm2022/core.mjs',
    vue: './npm:vue@3.5.16/dist/vue.runtime.esm-browser.js'
  },
  scopes: {
    './npm:@angular/core@20.0.4/': {
      '@angular/core/primitives/di': './npm:@angular/core@20.0.4/fesm2022/primitives/di.mjs',
      '@angular/core/primitives/signals':
        './npm:@angular/core@20.0.4/fesm2022/primitives/signals.mjs',
      rxjs: './npm:rxjs@7.8.2/dist/esm5/index.js',
      'rxjs/operators': './npm:rxjs@7.8.2/dist/esm5/operators/index.js'
    },
    './npm:rxjs@7.8.2/': { tslib: './npm:tslib@2.8.1/tslib.es6.mjs' }
  }
});
