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

assert.strictEqual(json.imports['lit-element'], '../node_modules/lit-element/lit-element.js');

assert.ok(
  json.scopes['../node_modules/lit-element/']['lit-html/'].startsWith('https://ga.jspm.io')
);
