import { Generator } from '@jspm/generator';
import assert from 'assert';

const generator = new Generator({
  mapUrl: import.meta.url,
  defaultProvider: 'jspm.io',
  env: ['production', 'browser']
});

await generator.install({ target: 'lit@2.0.0-rc.1', subpath: './html.js' });
const json = generator.getMap();
assert.strictEqual(json.imports['lit/html.js'], 'https://ga.jspm.io/npm:lit@2.0.0-rc.1/html.js');

// A trailing slash subpath installs every export under the prefix, excluding the main:
for (const install of [
  'lit@2.2.7/directives/',
  { target: 'lit@2.2.7', subpath: './directives/' }
]) {
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'jspm.io',
    env: ['production', 'browser']
  });
  await generator.install(install);
  const imports = Object.keys(generator.getMap().imports);
  assert.ok(imports.includes('lit/directives/guard.js'));
  assert.ok(imports.every(impt => impt.startsWith('lit/directives/')));
}

// A bare package prefix installs every subpath but not the main:
{
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'jspm.io',
    env: ['production', 'browser']
  });
  await generator.install('lit@2.2.7/');
  const imports = Object.keys(generator.getMap().imports);
  assert.ok(imports.includes('lit/html.js'));
  assert.ok(!imports.includes('lit'));
}
