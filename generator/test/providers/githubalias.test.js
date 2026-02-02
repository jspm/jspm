import { Generator } from '@jspm/generator';
import assert from 'assert';

// Test that GitHub-prefixed dependencies (e.g. "github:user/foo") resolve
// correctly with the nodemodules provider instead of freezing.
// See https://github.com/jspm/jspm/issues/2688

const generator = new Generator({
  mapUrl: new URL('./githubalias/', import.meta.url),
  defaultProvider: 'nodemodules'
});

await generator.link('./index.js');
const json = generator.getMap();

assert.strictEqual(json.imports['foo'], './node_modules/foo/index.js');
