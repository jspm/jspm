import { Generator } from '@jspm/generator';
import assert from 'assert';

const generator = new Generator({
  mapUrl: import.meta.url,
  rootUrl: new URL('./', import.meta.url),
  env: ['production', 'browser']
});

await generator.install({ target: './local/pkg', subpath: './json' });
const json = generator.getMap();

assert.strictEqual(json.imports['localpkg/json'], '/local/pkg/json.ts');
