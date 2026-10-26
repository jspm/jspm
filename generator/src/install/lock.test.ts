// @ts-ignore
import { ExactModule } from '@jspm/generator/install/package.js';
// @ts-ignore
import { translateProvider } from '@jspm/generator/install/lock.js';
import { Generator } from '@jspm/generator';
// @ts-ignore
import { encodeBase64 } from '@jspm/generator/common/b64.js';
import { strictEqual } from 'assert';

const rootUrl = new URL('../../../', import.meta.url);
const g = new Generator({
  mapUrl: rootUrl.href
});
const r = g.traceMap.resolver;

{
  /* changeProvider tests */
  async function testForRegistry(registry: string, n: string, v: string, isNull: boolean = false) {
    const mdl: ExactModule = {
      pkg: {
        name: n,
        version: v,
        registry
      },
      subpath: null,
      source: { provider: 'test', layer: 'default' }
    };

    // Should have switched to "npm" registry, as that's what jspm.io tracks:
    const provider = { provider: 'jspm.io', layer: 'default' };
    const res = await translateProvider(mdl, provider, r, rootUrl);
    if (isNull) {
      strictEqual(res, null);
    } else {
      strictEqual(res.pkg.name, 'sver');
      strictEqual(res.pkg.registry, 'npm');
      strictEqual(res.pkg.version, '2.0.1');
    }
  }

  // Must match the version of "sver" installed locally!
  await testForRegistry('npm', 'sver', '2.0.1');
  await testForRegistry(
    'node_modules',
    'sver',
    encodeBase64(new URL('./node_modules/sver/', rootUrl).href)
  );
}

{
  /* one lock per package per scope: the package pin takes it over subpath
     pins in either key order, and subpath-only pins resolve by key order */
  const main = 'https://ga.jspm.io/npm:three@0.136.0/build/three.module.js';
  const subpath = 'https://ga.jspm.io/npm:three@0.179.1/examples/jsm/postprocessing/ShaderPass.js';
  const scope = 'https://ga.jspm.io/npm:@react-three/fiber@8.0.0/' as const;
  for (const pins of [
    { three: main, 'three/examples/jsm/postprocessing/ShaderPass.js': subpath },
    { 'three/examples/jsm/postprocessing/ShaderPass.js': subpath, three: main }
  ]) {
    const g = new Generator({
      mapUrl: rootUrl.href,
      inputMap: { imports: pins, scopes: { [scope]: pins } }
    });
    await g.traceMap.processInputMap;
    const { installs } = g.traceMap.installer!;
    strictEqual(installs.primary.three.installUrl, 'https://ga.jspm.io/npm:three@0.136.0/');
    strictEqual(
      installs.secondary[scope].three.installUrl,
      'https://ga.jspm.io/npm:three@0.136.0/'
    );
  }
  const g = new Generator({
    mapUrl: rootUrl.href,
    inputMap: {
      imports: {
        'three/examples/jsm/postprocessing/ShaderPass.js': subpath,
        'three/build/three.module.js': main
      }
    }
  });
  await g.traceMap.processInputMap;
  strictEqual(
    g.traceMap.installer!.installs.primary.three.installUrl,
    'https://ga.jspm.io/npm:three@0.179.1/'
  );
}
