import assert from 'assert';
import { Generator } from '@jspm/generator';

const CDN = 'https://example.com/modules';

// Reduced repro of the FramerStudio import-map-generator-worker "local-project-pruning"
// link fixture.
//
// A dependency imported only by a linked secondary origin (the master origin does not import
// it) is seeded into the master scope - mirroring scopifyImportMap() moving a top-level
// import into the master scope ahead of the generator run. After link() with scopedLink +
// linkedScopes, the dependency should resolve into the master scope so that the consumer's
// descopifyImportMap() can lift it back to top-level `imports`.
//
// The linkedScopes contract gives every linked scope the same scope-object identity as its
// master, so the resolution is reflected in the master scope (hoistable by a consumer) while
// the secondary scope keeps a consistent copy.
{
  const masterScope = `${CDN}/masterAAA/`; // e.g. the local "screen" module
  const otherScope = `${CDN}/otherBBB/`; // e.g. the local "code file" module
  const depUrl = `${CDN}/depMOD/save1/mod.js`;

  const generator = new Generator({
    mapUrl: 'about:blank',
    inputMap: {
      imports: {},
      // scopifyImportMap moves the top-level `dep` import into the master scope.
      scopes: { [masterScope]: { dep: depUrl } }
    },
    env: ['production', 'browser', 'module'],
    flattenScopes: false,
    combineSubpaths: false,
    scopedLink: true,
    linkedScopes: { [masterScope]: [masterScope, otherScope] },
    customProviders: {
      test: {
        ownsUrl(url) {
          return url.startsWith(CDN + '/');
        },
        async getPackageConfig(url) {
          if (!url.startsWith(CDN + '/')) return {};
          const segments = url.slice(CDN.length + 1).split('/');
          const moduleId = segments[0];
          // Local modules have their package boundary at `${CDN}/moduleId/` (no saveId).
          if ((moduleId === 'masterAAA' || moduleId === 'otherBBB') && segments.length > 2)
            return null;
          return {};
        }
      }
    }
  });

  // The master origin imports nothing; only the secondary code file imports `dep`.
  generator.setVirtualSourceData(`${CDN}/masterAAA/save1/`, {
    'mod.js': "export default 'screen';"
  });
  generator.setVirtualSourceData(`${CDN}/otherBBB/save1/`, {
    'mod.js': 'import dep from "dep";\nexport default dep;'
  });
  generator.setVirtualSourceData(`${CDN}/depMOD/save1/`, { 'mod.js': 'export default 1;' });

  await generator.link([`${CDN}/masterAAA/save1/mod.js`, `${CDN}/otherBBB/save1/mod.js`]);
  const map = generator.getMap();

  // The shared dependency is promoted into the master scope (hoistable to top-level imports
  // by a descopify), even though the master origin never imported it.
  assert.ok(
    map.scopes?.[masterScope]?.dep,
    `dep should resolve into the master scope ${masterScope}, got scopes: ${JSON.stringify(
      map.scopes
    )}`
  );
  assert.strictEqual(map.scopes[masterScope].dep, depUrl);

  // The secondary keeps a consistent copy of the shared resolution.
  assert.strictEqual(map.scopes[otherScope]?.dep, depUrl);
}
