import { Generator } from '@jspm/generator';
import assert from 'assert';

const generator = new Generator({
  mapUrl: import.meta.url,
  defaultProvider: 'jsdelivr',
  env: ['production', 'browser']
});

await generator.install('lit@2.0.0-rc.1');
const json = generator.getMap();

assert.strictEqual(json.imports.lit, 'https://cdn.jsdelivr.net/npm/lit@2.0.0-rc.1/index.js');
const scope = json.scopes['https://cdn.jsdelivr.net/'];
assert.ok(scope['@lit/reactive-element']);
assert.ok(scope['lit-element/lit-element.js']);
assert.ok(scope['lit-html']);
