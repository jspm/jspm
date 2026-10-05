import { Generator } from '@jspm/generator';
import assert from 'assert';

const generator = new Generator({
  inputMap: {
    imports: {
      react: 'https://ga.jspm.io/npm:react@17.0.1/dev.index.js'
    },
    scopes: {
      'https://ga.jspm.io/': {
        'lit-html': 'https://ga.jspm.io/npm:lit-html@2.6.0/lit-html.js'
      }
    }
  },
  mapUrl: import.meta.url,
  env: ['production', 'browser'],
  resolutions: {
    lit: '2.6.1'
  }
});

// Install with no arguments should install all top-level pins.
await generator.install();
let json = generator.getMap();

assert.strictEqual(json.imports.react, 'https://ga.jspm.io/npm:react@17.0.1/index.js');

// Installing a new dependency with freeze should not throw:
// await generator.link(["lit"]);
// json = generator.getMap();

// assert.strictEqual(
//   json.imports.lit,
//   "https://ga.jspm.io/npm:lit@2.6.1/index.js"
// );

// // Even though latest for lit-html is 2.6.1, it should remain locked due to
// // the freeze option being set:
// assert.strictEqual(
//   json.scopes["https://ga.jspm.io/"]["lit-html"],
//   "https://ga.jspm.io/npm:lit-html@2.6.0/lit-html.js"
// );

// Install with no arguments retraces the pinned subpaths only, not the package roots:
{
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'jspm.io',
    env: ['production', 'browser'],
    inputMap: {
      imports: {
        'lit/html.js': 'https://ga.jspm.io/npm:lit@2.0.0-rc.1/html.js'
      }
    }
  });
  await generator.install();
  assert.deepStrictEqual(Object.keys(generator.getMap().imports), ['lit/html.js']);
}

// Packages without a root export reinstall from their subpath pins:
{
  const url = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css';
  const generator = new Generator({
    inputMap: {
      imports: {
        'bootstrap-icons/font/bootstrap-icons.min.css': url
      }
    }
  });
  await generator.install();
  assert.deepStrictEqual(generator.getMap(), {
    imports: {
      'bootstrap-icons/font/bootstrap-icons.min.css': url
    }
  });
}

// Install with no arguments and no top-level imports throws with the fix:
{
  const generator = new Generator();
  await assert.rejects(generator.install(), /no top-level imports.*subpaths: true/s);
}

// Argumentless latest-primaries respects the primary constraints like update():
{
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'jspm.io',
    env: ['production', 'browser'],
    inputMap: {
      imports: {
        react: 'https://ga.jspm.io/npm:react@17.0.1/dev.index.js'
      }
    }
  });
  await generator.install('latest-primaries');
  assert.strictEqual(
    generator.getMap().imports.react,
    'https://ga.jspm.io/npm:react@17.0.2/index.js'
  );
}

// Prefix mappings are reinstalled as the exports of their package under the prefix:
{
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'jspm.io',
    env: ['production', 'browser'],
    inputMap: {
      imports: {
        'lit/directives/': 'https://ga.jspm.io/npm:lit@2.2.7/directives/'
      }
    }
  });
  await generator.install();
  assert.ok(Object.keys(generator.getMap().imports).some(key => key.startsWith('lit/directives/')));
}
