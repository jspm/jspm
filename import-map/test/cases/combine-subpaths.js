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

// Default ('scopes') leaves top-level imports untouched
{
  const importMap = new ImportMap({ map });

  importMap.combineSubpaths();

  deepStrictEqual(importMap.toJSON(), map);
}

// 'both' combines top-level imports as well
{
  const importMap = new ImportMap({ map });

  importMap.sort();
  importMap.combineSubpaths('both');

  deepStrictEqual(importMap.toJSON(), {
    imports: {
      '/url/': '/another/',
      '/url/sub/': '/another/x/',
      'base/': '/',
      'base/another/c': '/another/c.js',
      'base/another/d': '/another/b.js',
      'only/mapping.js': './only/mapping.js'
    }
  });
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

// Prefix condensing: trailing-slash entries from known prefixes
{
  const importMap = new ImportMap({
    map: {
      imports: {
        'pkg': './node_modules/pkg/index.js',
        'pkg/modules/a.js': './node_modules/pkg/modules/a.js',
        'pkg/modules/b.js': './node_modules/pkg/modules/b.js',
        'pkg/modules/c.js': './node_modules/pkg/modules/c.js'
      }
    }
  });

  importMap.condenseImports({ imports: new Set(['pkg/modules/']) });

  deepStrictEqual(importMap.toJSON(), {
    imports: {
      'pkg': './node_modules/pkg/index.js',
      'pkg/modules/': './node_modules/pkg/modules/'
    }
  });
}

// Prefix condensing preserves shadowed exports with different targets
{
  const importMap = new ImportMap({
    map: {
      imports: {
        'pkg/modules/a.js': './node_modules/pkg/modules/a.js',
        'pkg/modules/b.js': './node_modules/pkg/modules/b.js',
        'pkg/modules/special': './node_modules/pkg/different/special.js'
      }
    }
  });

  importMap.condenseImports({ imports: new Set(['pkg/modules/']) });

  deepStrictEqual(importMap.toJSON(), {
    imports: {
      'pkg/modules/': './node_modules/pkg/modules/',
      'pkg/modules/special': './node_modules/pkg/different/special.js'
    }
  });
}

// Prefix condensing is scope-aware: only condenses matching scopes
{
  const importMap = new ImportMap({
    map: {
      imports: {
        'pkg/modules/a.js': './node_modules/pkg/modules/a.js',
        'pkg/modules/b.js': './node_modules/pkg/modules/b.js'
      },
      scopes: {
        '/scope/': {
          'pkg/modules/a.js': './other/pkg/modules/a.js',
          'pkg/modules/b.js': './other/pkg/modules/b.js'
        }
      }
    }
  });

  // Only provide prefixes for imports, not scopes — scopes should remain expanded
  importMap.condenseImports({ imports: new Set(['pkg/modules/']) });

  deepStrictEqual(importMap.toJSON(), {
    imports: {
      'pkg/modules/': './node_modules/pkg/modules/'
    },
    scopes: {
      '/scope/': {
        'pkg/modules/a.js': './other/pkg/modules/a.js',
        'pkg/modules/b.js': './other/pkg/modules/b.js'
      }
    }
  });
}

// Prefix condensing with scope-specific prefixes
{
  const importMap = new ImportMap({
    map: {
      imports: {
        'pkg/modules/a.js': './node_modules/pkg/modules/a.js',
        'pkg/modules/b.js': './node_modules/pkg/modules/b.js'
      },
      scopes: {
        '/scope/': {
          'pkg/modules/a.js': './other/pkg/modules/a.js',
          'pkg/modules/b.js': './other/pkg/modules/b.js'
        }
      }
    }
  });

  // Provide prefixes for both imports and the specific scope
  importMap.condenseImports({
    imports: new Set(['pkg/modules/']),
    scopes: { '/scope/': new Set(['pkg/modules/']) }
  });

  deepStrictEqual(importMap.toJSON(), {
    imports: {
      'pkg/modules/': './node_modules/pkg/modules/'
    },
    scopes: {
      '/scope/': {
        'pkg/modules/': './other/pkg/modules/'
      }
    }
  });
}

// No prefixes provided: combineSubpaths behaves as before
{
  const importMap = new ImportMap({
    map: {
      imports: {
        'pkg/a.js': './pkg/a.js',
        'pkg/b.js': './pkg/b.js'
      }
    }
  });

  importMap.sort();
  importMap.combineSubpaths('both');

  deepStrictEqual(importMap.toJSON(), {
    imports: {
      'pkg/': './pkg/'
    }
  });
}
