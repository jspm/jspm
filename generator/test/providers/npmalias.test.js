import { Generator } from '@jspm/generator';
import assert from 'assert';

// Test that NPM package aliases (e.g. "jquery3": "npm:jquery@^3.7.1")
// resolve correctly with the nodemodules provider.
// See https://github.com/jspm/jspm/issues/2687

const generator = new Generator({
  mapUrl: new URL('./npmalias/', import.meta.url),
  defaultProvider: 'nodemodules'
});

await generator.link('./index.js');
const json = generator.getMap();

assert.strictEqual(json.imports['jquery3'], './node_modules/jquery3/dist/jquery.js');
assert.strictEqual(json.imports['jquery4'], './node_modules/jquery4/dist/jquery.js');
