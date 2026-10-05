import { Generator } from '@jspm/generator';
import assert from 'assert';

// Non-module files under a wildcard export are validly exported assets: they are
// enumerated and mapped by subpaths: true but have no module graph of their own,
// so analysis must not fail on them. Only module extensions are parsed.
// https://github.com/jspm/jspm/issues/2751

const isBrowser = typeof process === 'undefined' || !process.versions?.node;

if (!isBrowser) {
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'nodemodules'
  });

  await generator.install({
    target: new URL('./wildcard-assets', import.meta.url).href,
    subpaths: true
  });

  const json = generator.getMap();
  assert.ok(json.imports['wildcard-assets-test'].endsWith('/index.js'));
  for (const asset of ['README.md', 'fonts/font.ttf']) {
    const resolved = generator.importMap.resolve(`wildcard-assets-test/${asset}`, import.meta.url);
    assert.ok(resolved.endsWith(`/${asset}`), `${asset} should stay resolvable`);
  }
}

// A module extension that fails to parse is still an analysis error.
if (!isBrowser) {
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'nodemodules'
  });

  await assert.rejects(
    generator.install({ target: new URL('./parse-error', import.meta.url).href }),
    /Unable to analyze .*parse-error\/index\.js/
  );
}
