import { deepStrictEqual } from 'assert';
import { ImportMap } from '@jspm/import-map';

const map = {
  imports: {
    'base/another/': '/another/',
    'base/a.js': '/a.js',
    'base/b.js': '/b.js',
    'base/another/a.js': '/another/a.js',
    'base/another/b.js': '/another/b.js',
    'base/another/c': '/another/c.js',
    'base/another/d': '/another/b.js',
    '/url/sub/': '/another/x/',
    '/url/sub/x.js': '/another/sub/x.js',
    '/url/sub/y.js': '/another/sub/y.js',
    '/url/z.js': '/another/z.js',
    'only/mapping.js': './only/mapping.js'
  }
};

{
  const importMap = new ImportMap({ map });

  importMap.combineSubpaths();

  deepStrictEqual(importMap.toJSON(), map);
}

{
  const importMap = new ImportMap({ map: { scopes: { '/': map.imports } } });

  importMap.sort();
  importMap.combineSubpaths();

  deepStrictEqual(importMap.toJSON(), {
    scopes: {
      '/': {
        '/url/': '/another/',
        '/url/sub/': '/another/x/',
        'base/': '/',
        'base/another/c': '/another/c.js',
        'base/another/d': '/another/b.js',
        'only/mapping.js': './only/mapping.js'
      }
    }
  });
}
