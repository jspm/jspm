import { Generator } from '@jspm/generator';
import assert from 'assert';

// Without combineSubpaths for imports, wildcard identity exports
// expand into individual entries
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

// With combineSubpaths: 'both', identity wildcard exports are combined
// into a single folder mapping
if (typeof window !== 'undefined') {
  // TODO: uncomment once import-map@1.3.0 is released
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'nodemodules',
    combineSubpaths: 'both'
  });

  await generator.install({
    target: new URL('./wildcard-identity', import.meta.url).href,
    subpaths: true
  });

  const json = generator.getMap();

  // The main export is still listed
  assert.strictEqual(json.imports['wildcard-identity'], './wildcard-identity/index.js');
  // Subpaths are combined into a folder mapping
  assert.strictEqual(json.imports['wildcard-identity/modules/'], './wildcard-identity/modules/');
  // Individual entries should not exist
  assert.strictEqual(json.imports['wildcard-identity/modules/a.js'], undefined);
  assert.strictEqual(json.imports['wildcard-identity/modules/b.js'], undefined);
  assert.strictEqual(json.imports['wildcard-identity/modules/c.js'], undefined);
}
