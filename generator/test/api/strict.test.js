import { Generator } from '@jspm/generator';
import assert from 'assert';

// Strict mode: the input map is a lockfile, the operation names what is traced,
// and session roots accumulate into the extracted map. Nothing is inferred
// from the map, so the argumentless and stateful operations throw.

const opts = {
  mapUrl: import.meta.url,
  defaultProvider: 'jspm.io',
  env: ['production', 'browser'],
  strict: true
};

// Inferred operations throw with the strict mode fix:
{
  const generator = new Generator({
    ...opts,
    inputMap: {
      imports: {
        react: 'https://ga.jspm.io/npm:react@17.0.1/index.js'
      }
    }
  });
  const strict = /strict mode.*subpaths: true/s;
  await assert.rejects(generator.install(), strict);
  await assert.rejects(generator.install('freeze'), strict);
  await assert.rejects(generator.reinstall(), strict);
  await assert.rejects(generator.update(), strict);
  await assert.rejects(generator.update('react'), strict);
  await assert.rejects(generator.uninstall('react'), strict);
}

// scopedLink implies strict:
{
  const generator = new Generator({ ...opts, strict: undefined, scopedLink: true });
  await assert.rejects(generator.install(), /strict mode/);
}

// The input map seeds nothing but its locks are honoured:
{
  const generator = new Generator({
    ...opts,
    inputMap: {
      imports: {
        'lit/html.js': 'https://ga.jspm.io/npm:lit@2.0.0-rc.1/html.js',
        react: 'https://ga.jspm.io/npm:react@17.0.1/index.js'
      }
    }
  });
  await generator.install('react', 'freeze');
  assert.deepStrictEqual(generator.getMap().imports, {
    react: 'https://ga.jspm.io/npm:react@17.0.1/index.js'
  });
}

// Installs accumulate across operations:
{
  const generator = new Generator(opts);
  await generator.install('react@17.0.2');
  await generator.install('lodash@4.17.21');
  assert.deepStrictEqual(Object.keys(generator.getMap().imports), ['lodash', 'react']);
}

// Scoped links accumulate into their scope:
{
  const generator = new Generator(opts);
  await generator.link('react');
  await generator.link('lodash');
  const json = generator.getMap();
  assert.strictEqual(json.imports, undefined);
  const scope = Object.values(json.scopes).find(scope => scope.react);
  assert.ok(scope.lodash, 'both links should land in the same scope');
}

// Installs and scoped links merge into one map:
{
  const generator = new Generator(opts);
  await generator.install('react@17.0.2');
  await generator.link('lodash');
  const json = generator.getMap();
  assert.deepStrictEqual(Object.keys(json.imports), ['react']);
  assert.ok(Object.values(json.scopes).some(scope => scope.lodash));
}

// Merging a map traces its top-level imports through its own locks:
{
  const generator = new Generator(opts);
  await generator.mergeMap({
    imports: {
      react: 'https://ga.jspm.io/npm:react@17.0.1/index.js'
    }
  });
  assert.strictEqual(
    generator.getMap().imports.react,
    'https://ga.jspm.io/npm:react@17.0.1/index.js'
  );
}

// Link takes module specifiers only; package targets throw:
{
  const generator = new Generator(opts);
  const target = /package target/;
  await assert.rejects(generator.link('lit/directives/'), target);
  await assert.rejects(generator.link('lit@2.2.7/html.js'), target);
  await assert.rejects(generator.link('@lit/reactive-element@1/reactive-element.js'), target);
  await generator.link('lit/html.js');
  assert.ok(Object.values(generator.getMap().scopes).some(scope => scope['lit/html.js']));
}

// A merged prefix mapping traces the exports of its package under the prefix:
{
  const generator = new Generator(opts);
  await generator.mergeMap({
    imports: {
      'lit/directives/': 'https://ga.jspm.io/npm:lit@2.2.7/directives/'
    }
  });
  assert.ok(
    Object.keys(generator.getMap().imports).some(key => key.startsWith('lit/directives/')),
    'merged prefix mapping should be traced into its exports'
  );
}
