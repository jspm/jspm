import { Generator } from '@jspm/generator';
import { setFetch, setRetryCount } from '@jspm/generator/common/fetch.js';
import { ImportMap } from '@jspm/import-map';
import assert from 'assert';

// An input pin that the lock of its scope cannot hold is retained as a custom
// mapping. These cases run against a provider of virtual packages:
//   pkg@1 has no "./sub" export, pkg@2 and pkg@3 do
//   pkg/dir/old.js is only in pkg@1, pkg/dir/new.js only in pkg@2 and pkg@3
//   pkg@4 is not virtual, for a network response
//   other and old import pkg, in the ranges >=1 and ^1

const CDN = 'https://cdn.test/';
const SITE = 'https://site.test/';
const url = (name, version, path = '') => `${CDN}${name}@${version}/${path}`;
const pkg = (version, path = 'index.js') => url('pkg', version, path);

const v1 = {
  'package.json': JSON.stringify({
    name: 'pkg',
    exports: { '.': './index.js', './dir/*': './dir/*' }
  }),
  'index.js': 'export {};',
  'dir/a.js': 'export {};',
  'dir/old.js': 'export {};'
};
const v2 = {
  'package.json': JSON.stringify({
    name: 'pkg',
    exports: { '.': './index.js', './sub': './sub.js', './dir/*': './dir/*' }
  }),
  'index.js': 'export {};',
  'sub.js': "import 'pkg';",
  'dir/a.js': "import 'pkg';",
  'dir/new.js': 'export {};'
};
const importer = (name, range) => ({
  'package.json': JSON.stringify({
    name,
    exports: './index.js',
    peerDependencies: { pkg: range }
  }),
  'index.js': "import 'pkg';"
});
const packages = {
  pkg: {
    '1.0.0': v1,
    '1.1.0': v1,
    '2.0.0': v2,
    '2.1.0': v2,
    '2.2.0': v2,
    '3.0.0': v2,
    '4.0.0': null
  },
  other: { '1.0.0': importer('other', '>=1.0.0') },
  old: { '1.0.0': importer('old', '^1.0.0') }
};
const scoped = name => ({
  [`${name}/package.json`]: JSON.stringify({ name, dependencies: { pkg: '^2.0.0' } }),
  [`${name}/both.js`]: "import 'pkg'; import 'pkg/sub';",
  [`${name}/main.js`]: "import 'pkg';",
  [`${name}/sub.js`]: "import 'pkg/sub';"
});

function generate(inputMap, opts) {
  const generator = new Generator({
    mapUrl: SITE,
    env: ['production', 'browser', 'module'],
    defaultProvider: 'virtual',
    customProviders: {
      virtual: {
        ownsUrl: url => url.startsWith(CDN),
        pkgToUrl: ({ name, version }) => url(name, version),
        parseUrlPkg(url) {
          if (!url.startsWith(CDN)) return;
          const [, name, version] = url.slice(CDN.length).match(/^([^@/]+)@([^/]+)\//) || [];
          if (name) return { registry: 'npm', name, version };
        },
        async resolveLatestTarget({ registry, name, range }) {
          const version = range.bestMatch(Object.keys(packages[name] || {}));
          return version ? { registry, name, version: version.toString() } : null;
        }
      }
    },
    inputMap,
    ...opts
  });
  for (const [name, versions] of Object.entries(packages)) {
    for (const [version, files] of Object.entries(versions))
      if (files) generator.setVirtualSourceData(url(name, version), files);
  }
  generator.setVirtualSourceData(SITE, {
    'both.js': "import 'pkg'; import 'pkg/sub';",
    'main.js': "import 'pkg';",
    ...scoped('a'),
    ...scoped('b')
  });
  return generator;
}

// The resolution of a specifier through the generated map
const resolve = (generator, specifier, parentUrl = SITE) =>
  new ImportMap({ map: generator.getMap(), mapUrl: SITE }).resolve(specifier, parentUrl);

const nextMajor = { inputPins: false, scopedLink: true, inputMapFallbacks: 'semver-compatible' };

// Both pins hold through a link, with the current defaults and the next major's
for (const opts of [{}, nextMajor]) {
  for (const main of [pkg('1.0.0'), pkg('2.1.0')]) {
    const sub = pkg('2.0.0', 'sub.js');
    for (const imports of [
      { pkg: main, 'pkg/sub': sub },
      { 'pkg/sub': sub, pkg: main }
    ]) {
      {
        const generator = generate({ imports }, opts);
        await generator.link(`${SITE}both.js`);
        assert.strictEqual(resolve(generator, 'pkg'), main);
        assert.strictEqual(resolve(generator, 'pkg/sub'), sub);
        // the retained pin resolves its own package by name
        assert.strictEqual(resolve(generator, 'pkg', sub), pkg('2.0.0'));
      }
      {
        const generator = generate({ imports }, opts);
        await generator.link(`${SITE}main.js`);
        assert.strictEqual(resolve(generator, 'pkg'), main);
        if (opts.inputPins === false)
          assert.ok(!JSON.stringify(generator.getMap()).includes('pkg/sub'));
      }
      {
        const generator = generate({ imports }, opts);
        await generator.install('other');
        assert.strictEqual(resolve(generator, 'pkg', url('other', '1.0.0', 'index.js')), main);
      }

      // A frozen install of the pins holds them, as does one without arguments
      const frozen = async () => {
        const generator = generate({ imports }, opts);
        await generator.install(['pkg', 'pkg/sub'], 'freeze');
        await generator.install('freeze');
        await generator.install();
        assert.deepStrictEqual(generator.getMap().imports, { pkg: main, 'pkg/sub': sub });
        return generator;
      };

      // An install of the package takes the retained pin with it
      for (const [install, then] of [
        ['pkg@3', 'pkg/sub'],
        ['pkg@3/sub', 'pkg']
      ]) {
        const generator = generate({ imports }, opts);
        await generator.install(install);
        await generator.install(then, 'freeze');
        assert.deepStrictEqual(generator.getMap().imports, {
          pkg: pkg('3.0.0'),
          'pkg/sub': pkg('3.0.0', 'sub.js')
        });
      }

      // An update does too, unless the updated version has no such export
      for (const names of [['pkg'], []]) {
        const generator = await frozen();
        await generator.update(...names);
        assert.deepStrictEqual(
          generator.getMap().imports,
          main === pkg('1.0.0')
            ? { pkg: pkg('1.1.0'), 'pkg/sub': sub }
            : { pkg: pkg('2.2.0'), 'pkg/sub': pkg('2.2.0', 'sub.js') }
        );
      }

      // An uninstall removes it
      {
        const generator = await frozen();
        await generator.uninstall('pkg/sub');
        assert.deepStrictEqual(generator.getMap(), { imports: { pkg: main } });
        await generator.install('pkg@2.1.0/sub', 'freeze');
        assert.strictEqual(generator.getMap().imports['pkg/sub'], pkg('2.1.0', 'sub.js'));
      }
      {
        const generator = await frozen();
        await generator.uninstall(['pkg', 'pkg/']);
        assert.deepStrictEqual(generator.getMap(), {});
      }
    }
  }
}

// Other custom mappings of the package are not its retained pins
{
  const generator = generate({ imports: { pkg: pkg('2.1.0'), 'pkg/sub': `${SITE}main.js` } });
  await generator.update('pkg');
  assert.deepStrictEqual(generator.getMap().imports, { pkg: pkg('2.2.0'), 'pkg/sub': './main.js' });
  await generator.uninstall('pkg/sub');
  assert.deepStrictEqual(generator.getMap().imports, { pkg: pkg('2.2.0'), 'pkg/sub': './main.js' });
}

// A linked group resolves a retained pin of any of its scopes the same way
{
  const [master, secondary] = [`${SITE}a/`, `${SITE}b/`];
  const sub = pkg('2.0.0', 'sub.js');
  const linked = scopes =>
    generate(
      { scopes },
      {
        inputPins: false,
        scopedLink: true,
        flattenScopes: false,
        linkedScopes: { [master]: [secondary] }
      }
    );
  for (const scopes of [
    { [master]: { pkg: pkg('2.1.0') }, [secondary]: { 'pkg/sub': sub } },
    { [master]: { 'pkg/sub': sub }, [secondary]: { pkg: pkg('2.1.0') } }
  ]) {
    for (const links of [['a/both.js', 'b/both.js'], ['b/both.js'], ['a/sub.js', 'b/main.js']]) {
      const generator = linked(scopes);
      await generator.link(links.map(link => SITE + link));
      for (const scope of [master, secondary]) {
        assert.strictEqual(resolve(generator, 'pkg/sub', scope), sub);
        if (links.length > 1) assert.strictEqual(resolve(generator, 'pkg', scope), pkg('2.1.0'));
      }
      assert.deepStrictEqual(generator.getMap({ collapseLinkedScopes: true }).imports, {
        pkg: pkg('2.1.0'),
        'pkg/sub': sub
      });
    }
  }

  // The package pin of the master is the version of the group
  for (const scopes of [
    { [master]: { pkg: pkg('2.1.0') }, [secondary]: { pkg: pkg('2.0.0') } },
    { [secondary]: { pkg: pkg('2.0.0') }, [master]: { pkg: pkg('2.1.0') } }
  ]) {
    const generator = linked(scopes);
    await generator.link(`${SITE}b/both.js`);
    assert.strictEqual(resolve(generator, 'pkg', secondary), pkg('2.1.0'));
    assert.strictEqual(resolve(generator, 'pkg/sub', secondary), pkg('2.1.0', 'sub.js'));
  }
}

// A flattened scope holding the package for the retained pin does not capture
// the other packages of its origin, in the output or when it is read back
{
  const imports = { pkg: pkg('1.0.0'), 'pkg/sub': pkg('2.0.0', 'sub.js') };
  const generator = generate({ imports });
  await generator.install(['other', 'old']);
  const check = generator => {
    assert.strictEqual(resolve(generator, 'pkg'), pkg('1.0.0'));
    assert.strictEqual(resolve(generator, 'pkg', pkg('2.0.0', 'sub.js')), pkg('2.0.0'));
    assert.strictEqual(resolve(generator, 'pkg', url('other', '1.0.0', 'index.js')), pkg('1.0.0'));
    assert.strictEqual(resolve(generator, 'pkg', url('old', '1.0.0', 'index.js')), pkg('1.0.0'));
  };
  check(generator);
  for (const opts of [{}, { inputMapFallbacks: 'semver-compatible' }]) {
    const roundtrip = generate(generator.getMap(), opts);
    await roundtrip.install('freeze');
    check(roundtrip);
  }
}

// A retained prefix pin is traced over the exports of its own version, and an
// exact pin under it keeps a third
for (const opts of [{}, nextMajor]) {
  const prefix = { pkg: pkg('1.0.0'), 'pkg/dir/': pkg('2.0.0', 'dir/') };
  for (const [imports, a] of [
    [prefix, '2.0.0'],
    [{ ...prefix, 'pkg/dir/a.js': pkg('2.1.0', 'dir/a.js') }, '2.1.0']
  ]) {
    const generator = generate({ imports }, { ...opts, expandWildcards: true });
    await generator.install(['pkg', 'pkg/dir/'], 'freeze');
    const map = generator.getMap().imports;
    assert.strictEqual(map.pkg, pkg('1.0.0'));
    assert.strictEqual(map['pkg/dir/a.js'], pkg(a, 'dir/a.js'));
    assert.strictEqual(map['pkg/dir/new.js'], pkg('2.0.0', 'dir/new.js'));
    assert.strictEqual(map['pkg/dir/old.js'], undefined);
    assert.strictEqual(resolve(generator, 'pkg', pkg(a, 'dir/a.js')), pkg(a));
  }

  // without a package pin the first of the two takes the lock
  {
    const imports = { 'pkg/dir/': pkg('2.0.0', 'dir/'), 'pkg/dir/a.js': pkg('1.0.0', 'dir/a.js') };
    const generator = generate({ imports }, { ...opts, expandWildcards: true });
    await generator.install('pkg/dir/', 'freeze');
    assert.deepStrictEqual(generator.getMap().imports, {
      'pkg/dir/a.js': pkg('1.0.0', 'dir/a.js'),
      'pkg/dir/new.js': pkg('2.0.0', 'dir/new.js')
    });
  }
}

// A package that fails to load is an error, not a version without the export
{
  setRetryCount(0);
  setFetch(async () => new Response('', { status: 503 }));
  const imports = { pkg: pkg('2.1.0'), 'pkg/sub': pkg('2.0.0', 'sub.js') };
  const generator = generate({ imports }, { inputPins: false });
  await assert.rejects(generator.install('pkg@4/sub'), /Invalid status code 503/);
}
