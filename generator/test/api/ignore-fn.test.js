import { Generator } from '@jspm/generator';
import assert from 'assert';

const seen = [];
const generator = new Generator({
  mapUrl: import.meta.url,
  inputMap: {
    imports: {
      react: './location/that/cant/be/traced.js'
    }
  },
  ignore: (specifier, parentUrl) => {
    seen.push([specifier, parentUrl]);
    return specifier === 'react';
  },
  env: ['production', 'browser', 'module']
});

await generator.install('@react-three/fiber@7.0.15');

// Function form is invoked with (specifier, parentUrl).
assert(
  seen.some(
    ([specifier, parentUrl]) =>
      specifier === 'react' && typeof parentUrl === 'string' && parentUrl.length > 0
  ),
  'expected ignore() to be called with (specifier, parentUrl)'
);

// Returning true from the function must skip that resolution — same
// observable outcome as the array form in ignore.test.js.
const json = generator.getMap();
assert.deepEqual(json.imports, {
  react: './location/that/cant/be/traced.js',
  '@react-three/fiber':
    'https://ga.jspm.io/npm:@react-three/fiber@7.0.15/dist/react-three-fiber.esm.js'
});
assert(json.scopes['https://ga.jspm.io/'].hasOwnProperty('react') === false);
