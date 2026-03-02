import { Generator } from '@jspm/generator';
import assert from 'assert';

// Test that wildcard exports with subpaths: true produce a single
// trailing-slash import map entry instead of individual entries per file.
// This is the fix for https://github.com/jspm/jspm/issues/2702.

// Default combineSubpaths: true
{
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'nodemodules'
  });

  await generator.install({
    target: new URL('./wildcard-subpaths', import.meta.url).href,
    subpaths: true
  });

  const json = generator.getMap();

  // Should have a trailing-slash entry instead of individual entries
  assert.ok(
    json.imports['wildcard-subpaths-test/modules/'],
    'Should have trailing-slash entry for modules/'
  );
  assert.strictEqual(
    json.imports['wildcard-subpaths-test/modules/a.js'],
    undefined,
    'Should not have individual entry for a.js'
  );
  assert.strictEqual(
    json.imports['wildcard-subpaths-test/modules/b.js'],
    undefined,
    'Should not have individual entry for b.js'
  );
  assert.strictEqual(
    json.imports['wildcard-subpaths-test/modules/c.js'],
    undefined,
    'Should not have individual entry for c.js'
  );
}

// combineSubpaths: false — should still collapse wildcard-expanded prefixes
{
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'nodemodules',
    combineSubpaths: false
  });

  await generator.install({
    target: new URL('./wildcard-subpaths', import.meta.url).href,
    subpaths: true
  });

  const json = generator.getMap();

  // Even without combineSubpaths, wildcard prefixes should still be collapsed
  assert.ok(
    json.imports['wildcard-subpaths-test/modules/'],
    'Should have trailing-slash entry even with combineSubpaths: false'
  );
  assert.strictEqual(
    json.imports['wildcard-subpaths-test/modules/a.js'],
    undefined,
    'Should not have individual entry for a.js'
  );
}

// Shadowed exports: specific exports that override the wildcard should be
// preserved alongside the trailing-slash entry.
{
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'nodemodules',
    combineSubpaths: false
  });

  await generator.install({
    target: new URL('./wildcard-subpaths-shadowed', import.meta.url).href,
    subpaths: true
  });

  const json = generator.getMap();

  // Should have the trailing-slash entry for the wildcard
  assert.ok(
    json.imports['wildcard-shadowed-test/modules/'],
    'Should have trailing-slash entry for modules/'
  );
  // Should NOT have individual entries for wildcard-matched files
  assert.strictEqual(
    json.imports['wildcard-shadowed-test/modules/a.js'],
    undefined,
    'Should not have individual entry for a.js'
  );
  // The shadowed export should be preserved as a specific entry
  assert.ok(
    json.imports['wildcard-shadowed-test/modules/special'],
    'Should preserve shadowed export for modules/special'
  );
}

// Suffix wildcards: "./foo/*.js" -> "./src/*.js" should condense to
// a trailing-slash entry with remapped base.
{
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'nodemodules',
    combineSubpaths: false
  });

  await generator.install({
    target: new URL('./wildcard-subpaths-suffix', import.meta.url).href,
    subpaths: true
  });

  const json = generator.getMap();

  // Should condense "./foo/*.js" -> "./src/*.js" into a trailing-slash entry
  assert.ok(
    json.imports['wildcard-suffix-test/foo/'],
    'Should have trailing-slash entry for foo/'
  );
  assert.strictEqual(
    json.imports['wildcard-suffix-test/foo/a.js'],
    undefined,
    'Should not have individual entry for a.js'
  );
  assert.strictEqual(
    json.imports['wildcard-suffix-test/foo/b.js'],
    undefined,
    'Should not have individual entry for b.js'
  );
}

// Mixed file types: "./foo/*.js" -> "./src/*.js" with non-.js files in src/
// should NOT condense, to avoid leaking non-exported files.
{
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'nodemodules',
    combineSubpaths: false
  });

  await generator.install({
    target: new URL('./wildcard-subpaths-mixed', import.meta.url).href,
    subpaths: true
  });

  const json = generator.getMap();

  // Should NOT have a trailing-slash entry (would leak secret.txt)
  assert.strictEqual(
    json.imports['wildcard-mixed-test/foo/'],
    undefined,
    'Should not have trailing-slash entry when non-matching files exist'
  );
  // Should have individual entries instead
  assert.ok(
    json.imports['wildcard-mixed-test/foo/a.js'],
    'Should have individual entry for a.js'
  );
  assert.ok(
    json.imports['wildcard-mixed-test/foo/b.js'],
    'Should have individual entry for b.js'
  );
}
