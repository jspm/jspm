import { Generator } from '@jspm/generator';
import assert from 'assert';

if (typeof document === 'undefined') {
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'nodemodules',
    commonJS: true
  });

  await generator.install('chalk');
  const json = generator.getMap();
  assert.equal(Object.keys(json.imports).length, 1);

  const scopeKeys = Object.keys(json.scopes);
  assert.equal(scopeKeys.length, 1);
  assert.equal(Object.keys(json.scopes[scopeKeys[0]]).length, 2);
}
