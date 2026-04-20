import { Generator } from '@jspm/generator';

// Reproduces https://github.com/jspm/jspm/issues/2717
// "types" condition with wildcard .d.ts mapping should not cause
// "Module not found" when "types" is not in env.

const isBrowser = typeof process === 'undefined' || !process.versions?.node;

if (!isBrowser) {
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'nodemodules',
    env: ['production', 'browser', 'module']
  });

  await generator.install({
    target: new URL('./wildcard-subpaths', import.meta.url).href,
    subpaths: true
  });
}
