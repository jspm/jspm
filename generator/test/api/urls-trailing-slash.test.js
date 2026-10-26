import { Generator } from '@jspm/generator';
import assert from 'assert';

// Servers may serve JavaScript at URLs ending in "/", which are valid module
// URLs: importable, mappable as import map targets, and resolvable as
// package.json targets.
const sources = {
  'mod/': 'import "./dep.js"; export default 1;',
  'mod/dep.js': 'export default 2;',
  'main.js': 'import "https://site.com/mod/";',
  'pkg/api/': 'import "#dep"; export default 3;'
};

// Importable: directly linked, and imported from another module, with its own
// relative imports resolving against the trailing-slash URL
{
  const generator = new Generator({
    mapUrl: 'about:blank',
    inputPins: false,
    packageConfigs: { 'https://site.com/': null }
  });
  generator.setVirtualSourceData('https://site.com/', sources);
  const { staticDeps } = await generator.link('https://site.com/mod/');
  assert.deepStrictEqual(staticDeps.sort(), [
    'https://site.com/mod/',
    'https://site.com/mod/dep.js'
  ]);
  const main = await generator.link('https://site.com/main.js');
  assert.deepStrictEqual(main.staticDeps.sort(), [
    'https://site.com/main.js',
    'https://site.com/mod/',
    'https://site.com/mod/dep.js'
  ]);
  assert.deepStrictEqual(generator.getMap(), {});
}

// Import map targets, both top-level and scoped
{
  const generator = new Generator({
    mapUrl: 'about:blank',
    inputPins: false,
    inputMap: { imports: { mod: 'https://site.com/mod/' } },
    packageConfigs: { 'https://site.com/': null }
  });
  generator.setVirtualSourceData('https://site.com/', sources);
  await generator.link('mod');
  assert.deepStrictEqual(generator.getMap(), { imports: { mod: 'https://site.com/mod/' } });
}
{
  const generator = new Generator({
    mapUrl: 'about:blank',
    inputPins: false,
    scopedLink: true,
    flattenScopes: false,
    inputMap: { scopes: { 'https://site.com/': { 'scoped-mod': 'https://site.com/mod/' } } },
    packageConfigs: { 'https://site.com/': null }
  });
  generator.setVirtualSourceData('https://site.com/', {
    ...sources,
    'scoped.js': 'import "scoped-mod";'
  });
  await generator.link('https://site.com/scoped.js');
  assert.deepStrictEqual(generator.getMap(), {
    scopes: { 'https://site.com/': { 'scoped-mod': 'https://site.com/mod/' } }
  });
}

// Package resolution targets: an exports target and a package imports target
{
  const generator = new Generator({
    mapUrl: 'about:blank',
    inputPins: false,
    flattenScopes: false,
    resolutions: { pkg: 'https://site.com/pkg/' },
    packageConfigs: {
      'https://site.com/': null,
      'https://site.com/pkg/': {
        name: 'pkg',
        exports: { '.': './api/' },
        imports: { '#dep': 'https://site.com/mod/' }
      }
    }
  });
  generator.setVirtualSourceData('https://site.com/', sources);
  await generator.link('pkg');
  assert.deepStrictEqual(generator.getMap(), {
    imports: { pkg: 'https://site.com/pkg/api/' },
    scopes: { 'https://site.com/pkg/': { '#dep': 'https://site.com/mod/' } }
  });
}
