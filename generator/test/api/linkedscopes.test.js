import { test } from 'node:test';
import assert from 'assert';
import { Generator } from '@jspm/generator';

// linked-primary has dep -> file:../dep
// linked-secondary has dep -> file:../dep-alt
// With linkedScopes, secondary should use primary's dep resolution instead of its own.

test('linkedScopes - secondary uses primary dependency ranges', async () => {
  const generator = new Generator({
    baseUrl: new URL('../', import.meta.url),
    mapUrl: import.meta.url,
    env: ['production', 'browser'],
    flattenScopes: false,
    linkedScopes: {
      './api/local/linked-primary/': ['./api/local/linked-secondary/']
    }
  });

  await generator.install({ target: './api/local/linked-primary' });
  await generator.install({ target: './api/local/linked-secondary' });
  const json = generator.getMap();

  const secondaryDep = json.scopes['./local/linked-secondary/']?.dep;
  assert.ok(secondaryDep, 'secondary scope should resolve dep');
  assert.ok(secondaryDep.includes('dep/main.js'), 'secondary should resolve dep via primary pjson');
  assert.ok(!secondaryDep.includes('dep-alt'), 'secondary should NOT use its own dep-alt');
});

test('linkedScopes - both scopes resolve dep identically', async () => {
  const generator = new Generator({
    baseUrl: new URL('../', import.meta.url),
    mapUrl: import.meta.url,
    env: ['production', 'browser'],
    flattenScopes: false,
    linkedScopes: {
      './api/local/linked-primary/': ['./api/local/linked-secondary/']
    }
  });

  await generator.install({ target: './api/local/linked-primary' });
  await generator.install({ target: './api/local/linked-secondary' });
  const json = generator.getMap();

  const primaryDep = json.scopes['./local/linked-primary/']?.dep;
  const secondaryDep = json.scopes['./local/linked-secondary/']?.dep;
  assert.ok(primaryDep, 'primary scope should have dep');
  assert.ok(secondaryDep, 'secondary scope should have dep');
  assert.strictEqual(primaryDep, secondaryDep, 'both scopes should resolve dep to the same URL');
});

test('without linkedScopes - each scope uses its own deps', async () => {
  const generator = new Generator({
    baseUrl: new URL('../', import.meta.url),
    mapUrl: import.meta.url,
    env: ['production', 'browser'],
    flattenScopes: false
  });

  await generator.install({ target: './api/local/linked-primary' });
  await generator.install({ target: './api/local/linked-secondary' });
  const json = generator.getMap();

  const primaryDep = json.scopes['./local/linked-primary/']?.dep;
  const secondaryDep = json.scopes['./local/linked-secondary/']?.dep;
  assert.ok(primaryDep.includes('dep/main.js'), 'primary resolves to dep');
  assert.ok(secondaryDep.includes('dep-alt/main.js'), 'secondary resolves to dep-alt');
  assert.notStrictEqual(primaryDep, secondaryDep, 'resolutions should differ without linkedScopes');
});

test('linkedScopes - scope boundaries are preserved in output map', async () => {
  const generator = new Generator({
    baseUrl: new URL('../', import.meta.url),
    mapUrl: import.meta.url,
    env: ['production', 'browser'],
    flattenScopes: false,
    linkedScopes: {
      './api/local/linked-primary/': ['./api/local/linked-secondary/']
    }
  });

  await generator.install({ target: './api/local/linked-primary' });
  await generator.install({ target: './api/local/linked-secondary' });
  const json = generator.getMap();

  assert.ok(json.scopes['./local/linked-primary/'], 'primary scope should exist separately');
  assert.ok(json.scopes['./local/linked-secondary/'], 'secondary scope should exist separately');
});

test('linkedScopes - inputMap resolutions use primary scope key', async () => {
  const generator = new Generator({
    baseUrl: new URL('../', import.meta.url),
    mapUrl: import.meta.url,
    env: ['production', 'browser'],
    flattenScopes: false,
    inputMap: {
      imports: {
        'linked-primary': './local/linked-primary/index.js'
      },
      scopes: {
        './local/linked-primary/': {
          dep: './local/dep/main.js'
        }
      }
    },
    linkedScopes: {
      './api/local/linked-primary/': ['./api/local/linked-secondary/']
    }
  });

  await generator.install({ target: './api/local/linked-secondary' });
  const json = generator.getMap();

  const secondaryDep = json.scopes['./local/linked-secondary/']?.dep;
  assert.ok(secondaryDep, 'secondary should resolve dep via primary inputMap lock');
  assert.ok(secondaryDep.includes('dep/main.js'), 'should use the primary lock resolution');
});
