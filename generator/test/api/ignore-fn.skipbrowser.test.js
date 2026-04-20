import { Generator } from '@jspm/generator';
import assert from 'assert';

const seen = [];
const generator = new Generator({
  mapUrl: import.meta.url,
  defaultProvider: 'jspm.io',
  env: ['production', 'browser', 'module'],
  ignore: (specifier, parentUrl) => {
    seen.push([specifier, parentUrl]);
    // Skip tracing into anything pulled in by an esm.sh module.
    return parentUrl.startsWith('https://esm.sh/');
  }
});

await generator.link('./local/esmsh-import/entry.js');

// The function form must be called with the direct esm.sh specifier from
// our local entry file.
assert(
  seen.some(
    ([specifier, parentUrl]) =>
      specifier === 'https://esm.sh/lodash@4.17.21' &&
      parentUrl.endsWith('/local/esmsh-import/entry.js')
  ),
  'expected ignore() to be called for the esm.sh specifier from entry.js'
);

// And it must also be called with parentUrls *inside* esm.sh, proving
// (specifier, parentUrl) gives access to nested graph context — which is
// the whole point of the function form.
assert(
  seen.some(([, parentUrl]) => parentUrl.startsWith('https://esm.sh/')),
  'expected ignore() to be called with an esm.sh parentUrl'
);

// Map still generates cleanly with the filter active.
generator.getMap();
