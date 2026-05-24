import { Generator } from '@jspm/generator';
import assert from 'assert';

const generator = new Generator({
  mapUrl: new URL('../../', import.meta.url),
  defaultProvider: 'nodemodules',
  providers: {
    'lit-html': 'jspm.io'
  }
});

await generator.install('lit-element');
await generator.install('lit-html');

const json = generator.getMap();

assert.strictEqual(json.imports['lit-element'], '../node_modules/lit-element/development/index.js');
assert.ok(json.imports['lit-html'].startsWith('https://ga.jspm.io'));
