import { Generator } from '@jspm/generator';
import assert from 'assert';
import { readFileSync } from 'fs';

// Use the exact input from a real Framer project that triggers:
// "TODO: Empty browser map for ./dist/node/extend.js in https://ga.jspm.io/npm:paper@0.12.17/dist/node/extend.js"
const fixture = JSON.parse(
  readFileSync(new URL('./empty-browser-map-input.json', import.meta.url), 'utf-8')
);

const generator = new Generator({
  mapUrl: 'about:blank',
  defaultProvider: 'jspm.io',
  env: ['production', 'browser', 'module'],
  inputMap: fixture.inputMap,
  ignore: fixture.ignoreList,
  resolutions: fixture.resolutions
});

await generator.install(fixture.installDescriptor);

const json = generator.getMap();
assert.ok(json.imports, 'should produce an import map');
