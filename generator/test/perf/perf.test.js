import { clearCache, Generator } from '@jspm/generator';
import assert from 'assert';
import { fetch } from '../../lib/common/fetch.js';

const largeInstallSet = await (
  await fetch(new URL('./large-install-set.json', import.meta.url), {})
).json();

const installs = Object.entries(largeInstallSet).map(([name, versionRange]) => ({
  target: name + '@' + versionRange
}));

const generatorOpts = {
  defaultProvider: 'jspm.io',
  resolutions: {
    react: '16.14.0',
    porto: '0.0.93'
  }
};

// First, prime the fetch cache so we are not testing the network as much as possible
{
  // await clearCache();
  const generator = new Generator(generatorOpts);
  const start = performance.now();
  await generator.install(installs);
  console.log(`PERF TEST TIME (uncached): ${performance.now() - start}ms`);
}

// Then we do the actual perf test run with fetch cache
let traceCache;
{
  const generator = new Generator({ ...generatorOpts, traceCache: true });
  const start = performance.now();
  await generator.install(installs);
  console.log(`PERF TEST TIME (fetch cached): ${performance.now() - start}ms`);
  traceCache = generator.getCache();
  console.log(
    `Trace cache: ${Object.keys(traceCache.packageConfigs).length} packages, ${
      Object.keys(traceCache.analysis).length
    } modules`
  );
}

// Finally, run with trace cache to test generator cache performance
{
  // await clearCache();
  const generator = new Generator({ ...generatorOpts, traceCache });
  const start = performance.now();
  await generator.install(installs);
  console.log(`PERF TEST TIME (trace cached): ${performance.now() - start}ms`);
}
