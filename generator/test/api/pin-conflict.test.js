import { Generator } from '@jspm/generator';
import assert from 'assert';

// A package pin and a subpath pin of the same package at another version
// share the one lock slot of their scope. The package pin is the resolution
// of the package, so it takes the slot in either key order and the subpath
// is retraced against it.

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
      'three/examples/jsm/postprocessing/ShaderPass.js':
        'https://ga.jspm.io/npm:three@0.136.0/examples/jsm/postprocessing/ShaderPass.js'
    }
  });
}
