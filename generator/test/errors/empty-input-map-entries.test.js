import { Generator } from '@jspm/generator';
import assert from 'assert';

// Verifies that @empty.js and @empty.dew.js stub entries from link() are
// stripped from the input map before install(), instead of crashing with
// "No '.' exports subpath defined" when tracing through @jspm/core.

// Fixture 1: @empty.js entries in top-level imports
{
  const generator = new Generator({
    mapUrl: 'about:blank',
    defaultProvider: 'jspm.io',
    env: ['production', 'browser', 'module'],
    scopedLink: true,
    inputMap: {
      imports: {
        'missing-pkg': 'https://ga.jspm.io/npm:@jspm/core@2.0.1/nodelibs/@empty.js'
      }
    }
  });

  await generator.install('es-module-lexer');

  const json = generator.getMap();
  assert.ok(json.imports, 'fixture 1: should produce an import map');
  assert.ok(json.imports['es-module-lexer'], 'fixture 1: should resolve installed package');
  assert.ok(!json.imports['missing-pkg'], 'fixture 1: @empty.js entry should be stripped');
}

// Fixture 2: @empty.js entries in scopes
{
  const generator = new Generator({
    mapUrl: 'about:blank',
    defaultProvider: 'jspm.io',
    env: ['production', 'browser', 'module'],
    scopedLink: true,
    inputMap: {
      imports: {
        'es-module-lexer': 'https://ga.jspm.io/npm:es-module-lexer@1.4.1/dist/lexer.js'
      },
      scopes: {
        'https://ga.jspm.io/': {
          '#some-internal': 'https://ga.jspm.io/npm:@jspm/core@2.0.1/nodelibs/@empty.js',
          'scoped-empty': 'https://ga.jspm.io/npm:@jspm/core@2.0.1/nodelibs/@empty.js'
        }
      }
    }
  });

  await generator.install('es-module-lexer');

  const json = generator.getMap();
  assert.ok(json.imports, 'fixture 2: should produce an import map');
  assert.ok(json.imports['es-module-lexer'], 'fixture 2: should resolve installed package');
}

// Fixture 3: @empty.dew.js entries (CJS stubs)
{
  const generator = new Generator({
    mapUrl: 'about:blank',
    defaultProvider: 'jspm.io',
    env: ['production', 'browser', 'module'],
    scopedLink: true,
    inputMap: {
      imports: {
        'missing-cjs': 'https://ga.jspm.io/npm:@jspm/core@2.0.1/nodelibs/@empty.dew.js'
      },
      scopes: {
        'https://ga.jspm.io/': {
          'scoped-cjs-empty': 'https://ga.jspm.io/npm:@jspm/core@2.0.1/nodelibs/@empty.dew.js'
        }
      }
    }
  });

  await generator.install('es-module-lexer');

  const json = generator.getMap();
  assert.ok(json.imports, 'fixture 3: should produce an import map');
  assert.ok(!json.imports['missing-cjs'], 'fixture 3: @empty.dew.js entry should be stripped');
}
