import { Generator } from '@jspm/generator';
import assert from 'assert';

// Subpaths enumerated by subpaths: true have no known importer: they may be
// imported as modules, as assets, or with import attributes, so they and the
// modules reached only through them may be build scripts whose dependencies
// never resolve for the environment. Their imports are allowed to fail to
// resolve without failing the install. Explicitly requested subpaths are not.
// https://github.com/jspm/jspm/issues/2751

const isBrowser = typeof process === 'undefined' || !process.versions?.node;

// Imports of an enumerated subpath may fail to resolve; resolvable ones are traced.
if (!isBrowser) {
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'nodemodules'
  });

  const { staticDeps } = await generator.install({
    target: new URL('./unknown-root', import.meta.url).href,
    subpaths: true
  });

  const json = generator.getMap();
  assert.ok(json.imports['unknown-root-test'].endsWith('/index.js'));
  assert.ok(
    generator.importMap
      .resolve('unknown-root-test/build/script.js', import.meta.url)
      .endsWith('/build/script.js'),
    'unknown root should stay mapped'
  );
  assert.ok(
    staticDeps.some(dep => dep.endsWith('/build/helper.js')),
    'resolvable imports of an unknown root should be traced'
  );
  assert.ok(!JSON.stringify(json).includes('nonexistent-dep-xyz'));
  assert.ok(
    generator.importMap
      .resolve('unknown-root-test/build/missing-import.js', import.meta.url)
      .endsWith('/build/missing-import.js'),
    'a missing relative import is tolerated like an unresolvable package'
  );
}

// An undefined "#internal" import is a not-found failure like any other.
if (!isBrowser) {
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'nodemodules'
  });

  await assert.rejects(
    generator.install({
      target: new URL('./unknown-root', import.meta.url).href,
      subpath: './build/internal.js'
    }),
    /No '#nope' import defined/
  );
}

// Only not-found resolution failures are tolerated.
if (!isBrowser) {
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'nodemodules',
    customResolver: specifier => {
      if (specifier === 'nonexistent-dep-xyz') throw new Error('boom');
    }
  });

  await assert.rejects(
    generator.install({
      target: new URL('./unknown-root', import.meta.url).href,
      subpaths: true
    }),
    /boom/
  );
}

// The package main has a known importer, the install itself, so it stays strict.
if (!isBrowser) {
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'nodemodules'
  });

  await assert.rejects(
    generator.install({
      target: new URL('./unknown-root-main', import.meta.url).href,
      subpaths: true
    }),
    /nonexistent-dep-xyz/
  );
}

// An enumerated subpath whose own target is missing is skipped, but requesting
// that subpath explicitly is still an error.
if (!isBrowser) {
  const target = new URL('./unknown-root-missing-target', import.meta.url).href;
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'nodemodules'
  });

  await generator.install({ target, subpaths: true });
  const json = generator.getMap();
  assert.ok(json.imports['unknown-root-missing-target-test'].endsWith('/index.js'));
  assert.strictEqual(json.imports['unknown-root-missing-target-test/foo'], undefined);

  await assert.rejects(
    new Generator({ mapUrl: import.meta.url, defaultProvider: 'nodemodules' }).install({
      target,
      subpath: './foo'
    }),
    /missing\.js/
  );
}

// An explicitly requested subpath has a known importer: its imports must resolve.
if (!isBrowser) {
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'nodemodules'
  });

  await assert.rejects(
    generator.install({
      target: new URL('./unknown-root', import.meta.url).href,
      subpath: './build/script.js'
    }),
    /nonexistent-dep-xyz/
  );
}

// The unknown importer carries down to modules reached only through enumeration.
if (!isBrowser) {
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'nodemodules'
  });

  const { staticDeps } = await generator.install({
    target: new URL('./unknown-root-nested', import.meta.url).href,
    subpaths: true
  });

  assert.ok(
    staticDeps.some(dep => dep.endsWith('/build/helper.js')),
    'module reached through an enumerated subpath should be traced'
  );
  assert.ok(!JSON.stringify(generator.getMap()).includes('nonexistent-dep-xyz'));
}

// But not when the chain starts from an explicitly requested subpath.
if (!isBrowser) {
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'nodemodules'
  });

  await assert.rejects(
    generator.install({
      target: new URL('./unknown-root-nested', import.meta.url).href,
      subpath: './build/script.js'
    }),
    /nonexistent-dep-xyz/
  );
}

// Enumerated pins keep their tolerance through an argumentless reinstall and
// update, and uninstalling them clears it.
if (!isBrowser) {
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'nodemodules'
  });

  await generator.install({
    target: new URL('./unknown-root', import.meta.url).href,
    subpaths: true
  });
  const json = JSON.stringify(generator.getMap());
  assert.ok(generator.traceMap.unknownPins.has('unknown-root-test/build/script.js'));

  await generator.install();
  assert.strictEqual(JSON.stringify(generator.getMap()), json);

  await generator.update();
  assert.strictEqual(JSON.stringify(generator.getMap()), json);

  await generator.uninstall('unknown-root-test/');
  assert.deepStrictEqual(Object.keys(generator.getMap().imports), ['unknown-root-test']);
  assert.strictEqual(generator.traceMap.unknownPins.size, 0);
}
