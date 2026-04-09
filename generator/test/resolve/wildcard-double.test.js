import { Generator } from '@jspm/generator';
import assert from 'assert';

// Test that exports with double wildcards like "./*": "./src/*/*.js"
// are expanded and traced correctly.
// This is the fix for https://github.com/jspm/jspm/issues/2719.

const isBrowser = typeof process === 'undefined' || !process.versions?.node;

if (!isBrowser) {
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'nodemodules',
    combineSubpaths: false
  });

  await generator.install({
    target: new URL('./wildcard-double', import.meta.url).href,
    subpaths: true
  });

  const json = generator.getMap();

  // Should have entries for both foo and bar subpaths
  assert.ok(json.imports['wildcard-double-test/foo'], 'Should have entry for foo');
  assert.ok(json.imports['wildcard-double-test/bar'], 'Should have entry for bar');

  // The mapped paths should point to the correct files
  assert.ok(
    json.imports['wildcard-double-test/foo'].endsWith('/src/foo/foo.js'),
    'foo should map to src/foo/foo.js'
  );
  assert.ok(
    json.imports['wildcard-double-test/bar'].endsWith('/src/bar/bar.js'),
    'bar should map to src/bar/bar.js'
  );
}
