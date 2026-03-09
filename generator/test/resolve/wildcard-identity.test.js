import { Generator } from '@jspm/generator';
import assert from 'assert';

// Lossless wildcard condensing is on by default (expandWildcards: false),
// so identity wildcard exports are always condensed into trailing-slash entries.
{
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'nodemodules',
    combineSubpaths: 'scopes'
  });

  await generator.install({
    target: new URL('./wildcard-identity', import.meta.url).href,
    subpaths: true
  });

  const json = generator.getMap();

  // Main export is still listed
  assert.strictEqual(json.imports['wildcard-identity'], './wildcard-identity/index.js');
  // Subpaths are condensed into a trailing-slash entry (lossless)
  assert.strictEqual(json.imports['wildcard-identity/modules/'], './wildcard-identity/modules/');
  // Individual entries should not exist
  assert.strictEqual(json.imports['wildcard-identity/modules/a.js'], undefined);
  assert.strictEqual(json.imports['wildcard-identity/modules/b.js'], undefined);
  assert.strictEqual(json.imports['wildcard-identity/modules/c.js'], undefined);
}

// With expandWildcards: true, wildcard exports are expanded into individual entries
{
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'nodemodules',
    expandWildcards: true
  });

  await generator.install({
    target: new URL('./wildcard-identity', import.meta.url).href,
    subpaths: true
  });

  const json = generator.getMap();

  // Each subpath is listed individually
  assert.strictEqual(json.imports['wildcard-identity'], './wildcard-identity/index.js');
  assert.strictEqual(
    json.imports['wildcard-identity/modules/a.js'],
    './wildcard-identity/modules/a.js'
  );
  assert.strictEqual(
    json.imports['wildcard-identity/modules/b.js'],
    './wildcard-identity/modules/b.js'
  );
  assert.strictEqual(
    json.imports['wildcard-identity/modules/c.js'],
    './wildcard-identity/modules/c.js'
  );
}
