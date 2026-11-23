import { Generator } from '@jspm/generator';
import { ImportMap } from '@jspm/import-map';
import assert from 'assert';

// A package pin and a subpath pin of the same package at another version
// share the one lock slot of their scope. The package pin is the resolution
// of the package, so it takes the slot in either key order, and the subpath
// pin stays at its own version, where its own-name import of the package
// resolves.

const main = 'https://ga.jspm.io/npm:three@0.136.0/build/three.module.js';
const subpath = 'https://ga.jspm.io/npm:three@0.179.1/examples/jsm/postprocessing/ShaderPass.js';

for (const imports of [
  { three: main, 'three/examples/jsm/postprocessing/ShaderPass.js': subpath },
  { 'three/examples/jsm/postprocessing/ShaderPass.js': subpath, three: main }
]) {
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'jspm.io',
    env: ['production', 'browser', 'module'],
    inputMap: { imports }
  });
  await generator.link('three');
  assert.deepStrictEqual(generator.getMap(), {
    imports: {
      three: main,
      'three/examples/jsm/': 'https://ga.jspm.io/npm:three@0.179.1/examples/jsm/'
    },
    scopes: {
      'https://ga.jspm.io/npm:three@0.179.1/': {
        three: 'https://ga.jspm.io/npm:three@0.179.1/build/three.module.js'
      }
    }
  });
}

// Another package of the CDN stays on the top-level three, where the scope of
// the subpath pin's version must not capture it
{
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'jspm.io',
    env: ['production', 'browser', 'module'],
    inputMap: {
      imports: { three: main, 'three/examples/jsm/postprocessing/ShaderPass.js': subpath }
    }
  });
  await generator.install('troika-three-utils@0.47.2');
  const map = new ImportMap({ map: generator.getMap(), mapUrl: import.meta.url });
  assert.strictEqual(map.resolve('three', generator.getMap().imports['troika-three-utils']), main);
  assert.strictEqual(
    map.resolve('three', subpath),
    'https://ga.jspm.io/npm:three@0.179.1/build/three.module.js'
  );
}

// The pin that does not get the lock is kept as given, whether or not the
// locked version has its export, and only where something imports it.

const react = 'https://ga.jspm.io/npm:motion@11.15.0/dist/es/motion/lib/react.mjs';
const lodash = 'https://ga.jspm.io/npm:lodash@4.17.21/lodash.js';

for (const motion of [
  'https://ga.jspm.io/npm:motion@10.14.1/dist/main.es.js',
  'https://ga.jspm.io/npm:motion@11.18.2/dist/es/motion/lib/index.mjs'
]) {
  for (const imports of [
    { motion, 'motion/react': react },
    { 'motion/react': react, motion }
  ]) {
    const opts = {
      mapUrl: 'about:blank',
      defaultProvider: 'jspm.io',
      env: ['production', 'browser', 'module'],
      inputMap: { imports }
    };
    const pins = { motion, 'motion/react': react };

    {
      const generator = new Generator(opts);
      await generator.install({ target: 'lodash@4.17.21' });
      assert.deepStrictEqual(generator.getMap().imports, { lodash, ...pins });
    }
    {
      const generator = new Generator({ ...opts, inputMap: { imports: { ...imports, lodash } } });
      await generator.uninstall('lodash');
      assert.deepStrictEqual(generator.getMap().imports, pins);
    }
    // The link holds under the current defaults and with the input map as a
    // lockfile, where a pin is only in the output when something imports it
    for (const linkOpts of [
      {},
      { inputPins: false },
      { inputPins: false, scopedLink: true, inputMapFallbacks: 'semver-compatible' }
    ]) {
      const linked = generator =>
        linkOpts.scopedLink
          ? generator.getMap().scopes['https://site.com/']
          : generator.getMap().imports;
      {
        const generator = new Generator({ ...opts, ...linkOpts });
        generator.setVirtualSourceData('https://site.com/', {
          'both.js': "import 'motion'; import 'motion/react';",
          'main.js': "import 'motion';"
        });
        await generator.link('https://site.com/both.js');
        assert.deepStrictEqual(linked(generator), pins);
      }
      {
        const generator = new Generator({ ...opts, ...linkOpts });
        await generator.link('https://site.com/main.js');
        assert.deepStrictEqual(linked(generator), linkOpts.inputPins === false ? { motion } : pins);
      }
    }
  }
}

// An install or update of the package takes a retained pin with it where the
// resulting version has its export, and an uninstall removes it.

const version = url => url.match(/npm:motion@([^/]+)\//)[1];
const generate = motion =>
  new Generator({
    mapUrl: 'about:blank',
    defaultProvider: 'jspm.io',
    env: ['production', 'browser', 'module'],
    inputMap: { imports: { motion, 'motion/react': react } }
  });
const [motion10, motion11] = [
  'https://ga.jspm.io/npm:motion@10.14.1/dist/main.es.js',
  'https://ga.jspm.io/npm:motion@11.18.2/dist/es/motion/lib/index.mjs'
];

for (const install of ['motion@12', 'motion@12/react']) {
  const generator = generate(motion11);
  await generator.install(install);
  const { imports } = generator.getMap();
  assert.ok(version(imports.motion).startsWith('12.'));
  assert.strictEqual(version(imports['motion/react']), version(imports.motion));
}

for (const names of [['motion'], []]) {
  {
    const generator = generate(motion10);
    await generator.update(...names);
    const { imports } = generator.getMap();
    assert.ok(version(imports.motion).startsWith('10.'));
    assert.notStrictEqual(imports.motion, motion10);
    assert.strictEqual(imports['motion/react'], react);
  }
  {
    const generator = generate(motion11);
    await generator.update(...names);
    const { imports } = generator.getMap();
    assert.ok(version(imports.motion).startsWith('11.'));
    assert.strictEqual(version(imports['motion/react']), version(imports.motion));
  }
}

for (const motion of [motion10, motion11]) {
  {
    const generator = generate(motion);
    await generator.uninstall(['motion', 'motion/']);
    assert.deepStrictEqual(generator.getMap(), {});
  }
  {
    const generator = generate(motion);
    await generator.uninstall('motion/react');
    assert.deepStrictEqual(generator.getMap().imports, { motion });
  }
  // An install without arguments and a frozen install hold the pins
  for (const mode of [undefined, 'freeze']) {
    const generator = generate(motion);
    await generator.install(mode);
    assert.deepStrictEqual(generator.getMap().imports, { motion, 'motion/react': react });
  }
}
