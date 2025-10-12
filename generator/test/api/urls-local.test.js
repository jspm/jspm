import { Generator } from '@jspm/generator';
import assert from 'assert';

const generator = new Generator({
  inputMap: {
    imports: {
      '#foo/local/dep.js': 'https://site.com/dep.js',
      '#bar/local/dep.js': 'https://site.com/foo/mod.js'
    }
  },
  flattenScopes: false,
  scopedLink: true,
  packageConfig: {
    'https://site.com/': null,
    'https://site.com/foo/': {}
  },
  mapUrl: 'about:blank'
});
generator.setVirtualSourceData('https://site.com/', {
  'foo/mod.js': 'import foo from "#foo/local/dep.js"',
  'dep.js': 'import var from "#bar/local/dep.js"'
});
await generator.link('https://site.com/foo/mod.js');
const map = generator.getMap();

assert.strictEqual(map.imports, undefined);
assert.strictEqual(
  map.scopes['https://site.com/foo/']['#foo/local/dep.js'],
  'https://site.com/dep.js'
);
assert.strictEqual(
  map.scopes['https://site.com/']['#bar/local/dep.js'],
  'https://site.com/foo/mod.js'
);
