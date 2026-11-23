// @ts-ignore
import { ExactModule } from '@jspm/generator/install/package.js';
// @ts-ignore
import { translateProvider } from '@jspm/generator/install/lock.js';
import { Generator } from '@jspm/generator';
// @ts-ignore
import { encodeBase64 } from '@jspm/generator/common/b64.js';
import { deepStrictEqual, strictEqual } from 'assert';

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

{
  /* the pin that loses the lock is kept as a custom mapping of its own scope */
  const main = 'https://ga.jspm.io/npm:motion@10.14.1/dist/main.es.js';
  const subpath = 'https://ga.jspm.io/npm:motion@11.15.0/dist/es/motion/lib/react.mjs';
  const scope = 'https://ga.jspm.io/npm:@react-three/fiber@8.0.0/' as const;
  for (const pins of [
    { motion: main, 'motion/react': subpath },
    { 'motion/react': subpath, motion: main }
  ]) {
    const g = new Generator({
      mapUrl: rootUrl.href,
      inputMap: { imports: pins, scopes: { [scope]: pins } }
    });
    await g.traceMap.processInputMap;
    const { inputMap, installer } = g.traceMap;
    strictEqual(
      installer!.installs.primary.motion.installUrl,
      'https://ga.jspm.io/npm:motion@10.14.1/'
    );
    deepStrictEqual({ ...inputMap.imports }, { 'motion/react': subpath });
    deepStrictEqual({ ...inputMap.scopes[scope] }, { 'motion/react': subpath });
  }

  const index = 'https://ga.jspm.io/npm:motion@11.18.2/dist/es/motion/lib/index.mjs';
  const g = new Generator({
    mapUrl: rootUrl.href,
    inputMap: { imports: { 'motion/react': subpath, 'motion/index': index, motion: index } }
  });
  await g.traceMap.processInputMap;
  strictEqual(
    g.traceMap.installer!.installs.primary.motion.installUrl,
    'https://ga.jspm.io/npm:motion@11.18.2/'
  );
  deepStrictEqual({ ...g.traceMap.inputMap.imports }, { 'motion/react': subpath });
}

{
  /* a linked group shares the mappings of its master scope: the losing pin of
     any of its scopes is kept there, and the master's own pin of a key decides it */
  const main = 'https://ga.jspm.io/npm:motion@11.18.2/dist/es/motion/lib/index.mjs';
  const other = 'https://ga.jspm.io/npm:motion@10.14.1/dist/main.es.js';
  const subpath = 'https://ga.jspm.io/npm:motion@11.15.0/dist/es/motion/lib/react.mjs';
  const master = 'https://ga.jspm.io/npm:@react-three/fiber@8.0.0/' as const;
  const secondary = 'https://ga.jspm.io/npm:@react-three/drei@9.0.0/' as const;
  for (const scopes of [
    { [master]: { motion: main }, [secondary]: { motion: other, 'motion/react': subpath } },
    { [secondary]: { 'motion/react': subpath, motion: other }, [master]: { motion: main } }
  ]) {
    const g = new Generator({
      mapUrl: rootUrl.href,
      linkedScopes: { [master]: [secondary] },
      inputMap: { scopes }
    });
    await g.traceMap.processInputMap;
    const { inputMap, installer } = g.traceMap;
    deepStrictEqual(
      { ...installer!.installs.secondary[master] },
      {
        motion: { installUrl: 'https://ga.jspm.io/npm:motion@11.18.2/' }
      }
    );
    deepStrictEqual({ ...inputMap.scopes[master] }, { 'motion/react': subpath });
    strictEqual(inputMap.scopes[secondary], undefined);
  }
}
