import assert from 'assert';
import { Generator } from '@jspm/generator';

const CDN = 'https://example.com/modules';

// Linked scopes share one scope object, so getMap() repeats the shared mappings under every
// linked scope URL. getMap({ collapseLinkedScopes: true }) hoists them to the top-level imports
// once, keeping scopes outside the group as they are.
function createGenerator(inputMap, linkedScopes) {
  return new Generator({
    mapUrl: 'about:blank',
    inputMap,
    env: ['production', 'browser', 'module'],
    flattenScopes: false,
    combineSubpaths: false,
    scopedLink: true,
    linkedScopes,
    customProviders: {
      test: {
        ownsUrl(url) {
          return url.startsWith(CDN + '/');
        },
        async getPackageConfig(url) {
          if (!url.startsWith(CDN + '/')) return {};
          const segments = url.slice(CDN.length + 1).split('/');
          if (segments[0].endsWith('Local') && segments.length > 2) return null;
          return {};
        }
      }
    }
  });
}

const masterScope = `${CDN}/masterLocal/`;
const otherScope = `${CDN}/otherLocal/`;
const thirdScope = `${CDN}/thirdLocal/`;
const depUrl = `${CDN}/depMOD/save1/mod.js`;
const depAltUrl = `${CDN}/depALT/save1/mod.js`;
const dep2Url = `${CDN}/dep2MOD/save1/mod.js`;

function setSources(generator) {
  generator.setVirtualSourceData(`${CDN}/masterLocal/save1/`, {
    'mod.js': "export default 'master';"
  });
  generator.setVirtualSourceData(`${CDN}/otherLocal/save1/`, {
    'mod.js': 'import dep from "dep";\nexport default dep;'
  });
  generator.setVirtualSourceData(`${CDN}/thirdLocal/save1/`, {
    'mod.js': 'import dep2 from "dep2";\nexport default dep2;'
  });
  generator.setVirtualSourceData(`${CDN}/depMOD/save1/`, { 'mod.js': 'export default 1;' });
  generator.setVirtualSourceData(`${CDN}/depALT/save1/`, { 'mod.js': 'export default 2;' });
  generator.setVirtualSourceData(`${CDN}/dep2MOD/save1/`, { 'mod.js': 'export default 3;' });
}

const modules = [
  `${CDN}/masterLocal/save1/mod.js`,
  `${CDN}/otherLocal/save1/mod.js`,
  `${CDN}/thirdLocal/save1/mod.js`
];

// Shared mappings hoist to imports, the group scopes are dropped, other scopes are kept
{
  const generator = createGenerator(
    {
      imports: {},
      scopes: { [masterScope]: { dep: depUrl }, [thirdScope]: { dep2: dep2Url } }
    },
    { [masterScope]: [masterScope, otherScope] }
  );
  setSources(generator);
  await generator.link(modules);

  const map = generator.getMap();
  assert.strictEqual(map.scopes[masterScope].dep, depUrl);
  assert.strictEqual(map.scopes[otherScope].dep, depUrl);
  assert.strictEqual(map.scopes[thirdScope].dep2, dep2Url);
  assert.strictEqual(map.imports?.dep, undefined);

  const collapsed = generator.getMap({ collapseLinkedScopes: true });
  assert.strictEqual(collapsed.imports.dep, depUrl);
  assert.strictEqual(collapsed.scopes[masterScope], undefined);
  assert.strictEqual(collapsed.scopes[otherScope], undefined);
  assert.strictEqual(collapsed.scopes[thirdScope].dep2, dep2Url);
  assert.strictEqual(collapsed.scopes[thirdScope].dep, undefined);
}

// A shared mapping that conflicts with a top-level import stays scoped
{
  const generator = createGenerator(
    {
      imports: { dep: depAltUrl },
      scopes: { [masterScope]: { dep: depUrl } }
    },
    { [masterScope]: [masterScope, otherScope] }
  );
  setSources(generator);
  await generator.link(modules.slice(0, 2));

  const collapsed = generator.getMap({ collapseLinkedScopes: true });
  assert.strictEqual(collapsed.imports.dep, depAltUrl);
  assert.strictEqual(collapsed.scopes[masterScope].dep, depUrl);
  assert.strictEqual(collapsed.scopes[otherScope].dep, depUrl);
}

// Conflicting groups hoist in linkedScopes declaration order, not scope order
{
  const zetaScope = `${CDN}/zetaLocal/`;
  const zeta2Scope = `${CDN}/zeta2Local/`;
  const alphaScope = `${CDN}/alphaLocal/`;
  const alpha2Scope = `${CDN}/alpha2Local/`;
  const generator = createGenerator(
    {
      imports: {},
      scopes: { [zetaScope]: { dep: depUrl }, [alphaScope]: { dep: depAltUrl } }
    },
    { [zetaScope]: [zeta2Scope], [alphaScope]: [alpha2Scope] }
  );
  for (const scope of [zetaScope, zeta2Scope, alphaScope, alpha2Scope])
    generator.setVirtualSourceData(`${scope}save1/`, {
      'mod.js': 'import dep from "dep";\nexport default dep;'
    });
  generator.setVirtualSourceData(`${CDN}/depMOD/save1/`, { 'mod.js': 'export default 1;' });
  generator.setVirtualSourceData(`${CDN}/depALT/save1/`, { 'mod.js': 'export default 2;' });
  await generator.link([
    `${alphaScope}save1/mod.js`,
    `${alpha2Scope}save1/mod.js`,
    `${zetaScope}save1/mod.js`,
    `${zeta2Scope}save1/mod.js`
  ]);

  const collapsed = generator.getMap({ collapseLinkedScopes: true });
  assert.strictEqual(collapsed.imports.dep, depUrl);
  assert.strictEqual(collapsed.scopes[zetaScope], undefined);
  assert.strictEqual(collapsed.scopes[zeta2Scope], undefined);
  assert.strictEqual(collapsed.scopes[alphaScope].dep, depAltUrl);
  assert.strictEqual(collapsed.scopes[alpha2Scope].dep, depAltUrl);
}

// Without linkedScopes the option is a no-op
{
  const generator = createGenerator(
    { imports: {}, scopes: { [masterScope]: { dep: depUrl } } },
    undefined
  );
  setSources(generator);
  await generator.link(modules.slice(0, 1));

  assert.deepStrictEqual(generator.getMap({ collapseLinkedScopes: true }), generator.getMap());
}
