import { Generator } from '@jspm/generator';
import assert from 'assert';

// Lossless wildcard condensing works in scopes
{
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'nodemodules',
    combineSubpaths: false
  });

  await generator.install({
    target: new URL('./wildcard-scoped/', import.meta.url).href,
    subpaths: true
  });

  const json = generator.getMap();

  const scope = json.scopes?.['./wildcard-scoped/'];
  assert.ok(scope, 'Should have a scope for the fixture');
  assert.strictEqual(
    scope['wildcard-dep/modules/'],
    './wildcard-scoped/node_modules/wildcard-dep/modules/',
    'Should have trailing-slash entry in scope'
  );
  assert.strictEqual(
    scope['wildcard-dep/modules/a.js'],
    undefined,
    'Should not have individual a.js'
  );
  assert.strictEqual(
    scope['wildcard-dep/modules/b.js'],
    undefined,
    'Should not have individual b.js'
  );
  assert.strictEqual(
    scope['wildcard-dep/modules/c.js'],
    undefined,
    'Should not have individual c.js'
  );
}

// With expandWildcards: true, scope entries remain expanded
{
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'nodemodules',
    combineSubpaths: false,
    expandWildcards: true
  });

  await generator.install({
    target: new URL('./wildcard-scoped/', import.meta.url).href,
    subpaths: true
  });

  const json = generator.getMap();

  const scope = json.scopes?.['./wildcard-scoped/'];
  assert.ok(scope, 'Should have a scope for the fixture');
  assert.strictEqual(
    scope['wildcard-dep/modules/'],
    undefined,
    'Should not have trailing-slash entry'
  );
  assert.ok(scope['wildcard-dep/modules/a.js'], 'Should have individual a.js');
  assert.ok(scope['wildcard-dep/modules/b.js'], 'Should have individual b.js');
  assert.ok(scope['wildcard-dep/modules/c.js'], 'Should have individual c.js');
}
