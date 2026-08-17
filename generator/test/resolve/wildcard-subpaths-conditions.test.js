import { Generator } from '@jspm/generator';
import assert from 'assert';

// A wildcard export behind a condition object must enumerate the subpaths that
// actually resolve for the environment. Previously an unknown condition ordered
// before "default" (here "types") shadowed it during enumeration, producing
// ./src/a.d.ts subpaths that then failed to trace.
// https://github.com/jspm/jspm/issues/2717

const isBrowser = typeof process === 'undefined' || !process.versions?.node;

if (!isBrowser) {
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'nodemodules',
    combineSubpaths: false
  });

  await generator.install({
    target: new URL('./wildcard-subpaths-conditions', import.meta.url).href,
    subpaths: true
  });

  const json = generator.getMap();

  assert.ok(
    json.imports['wildcard-conditions-test/src/'],
    'Should have trailing-slash entry for src/'
  );
  assert.ok(
    json.imports['wildcard-conditions-test/dist/'],
    'Should have trailing-slash entry for dist/'
  );
  assert.ok(
    json.imports['wildcard-conditions-test/src/'].endsWith('/src/'),
    'src/ should map to the "default" target, not the "types" target'
  );
}

// Declaration files under a wildcard export are validly exported and must stay
// resolvable, but must not be traced — their specifiers follow TypeScript
// declaration resolution ("./x.js" naming an ./x.d.ts) rather than a runtime
// module graph, so tracing them fails to resolve.
if (!isBrowser) {
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'nodemodules'
  });

  await generator.install({
    target: new URL('./wildcard-subpaths-conditions', import.meta.url).href,
    subpaths: true
  });

  const resolved = generator.importMap.resolve(
    'wildcard-conditions-test/src/decl.d.ts',
    import.meta.url
  );
  assert.ok(resolved.endsWith('/src/decl.d.ts'), 'Declaration subpath should stay resolvable');
}
