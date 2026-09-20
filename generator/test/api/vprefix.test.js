import { Generator } from '@jspm/generator';
import assert from 'assert';

const generator = new Generator({
  mapUrl: new URL('./local/vprefix/', import.meta.url),
  defaultProvider: 'jspm.io',
  env: ['production', 'browser', 'module']
});

await generator.link('./index.js');

assert.strictEqual(
  generator.getMap().imports['lodash-es'],
  'https://ga.jspm.io/npm:lodash-es@4.17.20/lodash.js'
);
