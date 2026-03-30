import { readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { Generator } from '@jspm/generator';
import { fetch } from '../../lib/common/fetch.js';

const perfDir = new URL('./', import.meta.url);
const files = await readdir(new URL('./', import.meta.url));
const fixtures = files.filter(f => f.endsWith('.json'));

for (const fixture of fixtures) {
  const name = fixture.replace(/\.json$/, '');
  const data = await (await fetch(new URL(fixture, perfDir), {})).json();

  if (fixture.endsWith('.install.json')) {
    test(name, () => runInstallTest(name, data));
  } else if (fixture.endsWith('.link.json')) {
    test(name, () => runLinkTest(name, data));
  }
}

async function runInstallTest(name, installSet) {
  const installs = Object.entries(installSet).map(([pkg, versionRange]) => ({
    target: pkg + '@' + versionRange
  }));

  const generatorOpts = {
    defaultProvider: 'jspm.io',
    resolutions: {
      react: '16.14.0',
      porto: '0.0.93',
      '@walletconnect/utils': '2.23.7',
      '@walletconnect/sign-client': '2.23.7',
      'framer-motion': '12.34.0',
      'viem': '2.46.0'
    }
  };

  // First, prime the fetch cache so we are not testing the network as much as possible
  {
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
    const generator = new Generator({ ...generatorOpts, traceCache });
    const start = performance.now();
    await generator.install(installs);
    console.log(`PERF TEST TIME (trace cached): ${performance.now() - start}ms`);
  }
}

async function runLinkTest(name, linkOpts) {
  const { inputMap, entryPoints, ignoreList, resolutions, ...rest } = linkOpts;

  const generatorOpts = {
    defaultProvider: 'jspm.io',
    env: ['browser', 'development', 'module'],
    inputMapFallbacks: 'semver-compatible',
    inputMap,
    ...(ignoreList ? { ignore: ignoreList } : {}),
    ...(resolutions && Object.keys(resolutions).length ? { resolutions } : {}),
    ...rest
  };

  const specifiers = entryPoints || Object.keys(inputMap?.imports || {});

  // First, prime the fetch cache
  {
    const generator = new Generator(generatorOpts);
    const start = performance.now();
    await generator.link(specifiers);
    console.log(`PERF TEST TIME (uncached): ${performance.now() - start}ms`);
  }

  // Then with fetch cache
  let traceCache;
  {
    const generator = new Generator({ ...generatorOpts, traceCache: true });
    const start = performance.now();
    await generator.link(specifiers);
    console.log(`PERF TEST TIME (fetch cached): ${performance.now() - start}ms`);
    traceCache = generator.getCache();
    console.log(
      `Trace cache: ${Object.keys(traceCache.packageConfigs).length} packages, ${
        Object.keys(traceCache.analysis).length
      } modules`
    );
  }
  debugger;

  // Finally, with trace cache
  {
    const generator = new Generator({ ...generatorOpts, traceCache });
    const start = performance.now();
    await generator.link(specifiers);
    console.log(`PERF TEST TIME (trace cached): ${performance.now() - start}ms`);
  }
}
