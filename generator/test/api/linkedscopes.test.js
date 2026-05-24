import assert from 'assert';
import { Generator } from '@jspm/generator';

// linked-primary has dep -> file:../dep
// linked-secondary has dep -> file:../dep-alt
// With linkedScopes, secondary should use primary's dep resolution instead of its own.

{
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

  // Secondary should resolve dep using primary's pjson (dep, not dep-alt)
  const secondaryDep = json.scopes['./local/linked-secondary/']?.dep;
  assert.ok(secondaryDep, 'secondary scope should resolve dep');
  assert.ok(secondaryDep.includes('dep/main.js'), 'secondary should resolve dep via primary pjson');
  assert.ok(!secondaryDep.includes('dep-alt'), 'secondary should NOT use its own dep-alt');

  // Both scopes should resolve dep to the same URL
  const primaryDep = json.scopes['./local/linked-primary/']?.dep;
  assert.ok(primaryDep, 'primary scope should have dep');
  assert.strictEqual(primaryDep, secondaryDep, 'both scopes should resolve dep to the same URL');

  // Scope boundaries should be preserved in the output map
  assert.ok(json.scopes['./local/linked-primary/'], 'primary scope should exist separately');
  assert.ok(json.scopes['./local/linked-secondary/'], 'secondary scope should exist separately');
}

// Without linkedScopes, each scope uses its own deps
{
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
  assert.ok(primaryDep !== secondaryDep, 'resolutions should differ without linkedScopes');
}

// InputMap resolutions use primary scope key
{
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
}

// linked-version-primary has semver@6, linked-version-secondary has semver@7.
// With linkedScopes, secondary should use primary's range (6), not its own (7).
{
  const generator = new Generator({
    baseUrl: new URL('../', import.meta.url),
    mapUrl: import.meta.url,
    env: ['production', 'browser'],
    flattenScopes: false,
    linkedScopes: {
      './api/local/linked-version-primary/': ['./api/local/linked-version-secondary/']
    }
  });

  await generator.install({ target: './api/local/linked-version-primary' });
  await generator.install({ target: './api/local/linked-version-secondary' });
  const json = generator.getMap();

  const primarySemver = json.scopes['./local/linked-version-primary/']?.semver;
  const secondarySemver = json.scopes['./local/linked-version-secondary/']?.semver;
  assert.ok(primarySemver, 'primary scope should have semver');
  assert.ok(secondarySemver, 'secondary scope should have semver');
  assert.ok(primarySemver.includes('semver@6.'), 'primary should resolve semver@6');
  assert.ok(secondarySemver.includes('semver@6.'), 'secondary should resolve semver@6 via primary range');
  assert.strictEqual(primarySemver, secondarySemver, 'both scopes should share the same resolution');
}

// #-prefixed inputMap specifiers resolve via linked master scope
{
  const CDN = 'https://example.com/modules';
  const masterScope = `${CDN}/masterAAA/`;
  const otherScope = `${CDN}/otherBBB/`;

  const generator = new Generator({
    mapUrl: 'about:blank',
    inputMap: {
      imports: {},
      scopes: {
        [masterScope]: {
          '#framer/local/comp/abc/abc.js': `${CDN}/masterAAA/save1/mod.js`,
          lodash: 'https://ga.jspm.io/npm:lodash@4.17.21/lodash.js',
        },
      },
    },
    env: ['production', 'browser', 'module'],
    flattenScopes: false,
    combineSubpaths: false,
    scopedLink: true,
    linkedScopes: {
      [masterScope]: [masterScope, otherScope],
    },
    customProviders: {
      test: {
        ownsUrl(url) {
          return url.startsWith(CDN + '/');
        },
        async getPackageConfig(url) {
          if (!url.startsWith(CDN + '/')) return {};
          const segments = url.slice(CDN.length + 1).split('/');
          const moduleId = segments[0];
          if (
            (moduleId === 'masterAAA' || moduleId === 'otherBBB') &&
            segments.length > 2
          )
            return null;
          return {};
        },
      },
    },
  });

  generator.setVirtualSourceData(`${CDN}/otherBBB/save1/`, {
    'mod.js': 'import comp from "#framer/local/comp/abc/abc.js";\nexport default comp;',
  });
  generator.setVirtualSourceData(`${CDN}/masterAAA/save1/`, {
    'mod.js': "export default 'A';",
  });

  await generator.link([`${CDN}/otherBBB/save1/mod.js`]);
  const map = generator.getMap();

  const otherScopeMappings = map.scopes[otherScope];
  assert.ok(otherScopeMappings, 'otherBBB scope should exist in the output map');
  assert.ok(
    otherScopeMappings['#framer/local/comp/abc/abc.js'],
    '#-prefixed specifier should be resolved for the linked secondary scope'
  );
  assert.strictEqual(
    otherScopeMappings['#framer/local/comp/abc/abc.js'],
    `${CDN}/masterAAA/save1/mod.js`,
    '#-prefixed specifier should resolve to the master scope target'
  );
}

// Freeze install preserves primary inputMap resolution despite secondary range conflict
{
  const generator = new Generator({
    baseUrl: new URL('../', import.meta.url),
    mapUrl: import.meta.url,
    env: ['production', 'browser'],
    flattenScopes: false,
    inputMap: {
      scopes: {
        './local/linked-version-primary/': {
          semver: 'https://ga.jspm.io/npm:semver@6.3.0/semver.js'
        }
      }
    },
    linkedScopes: {
      './api/local/linked-version-primary/': ['./api/local/linked-version-secondary/']
    }
  });

  await generator.install({ target: './api/local/linked-version-secondary' }, 'freeze');
  const json = generator.getMap();

  const secondarySemver = json.scopes['./local/linked-version-secondary/']?.semver;
  assert.ok(secondarySemver, 'secondary scope should have semver');
  assert.ok(secondarySemver.includes('semver@6.3.0'), 'freeze should preserve primary inputMap resolution');
}
