import { readdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Generator } from '@jspm/generator';
import { fetch } from '../../lib/common/fetch.js';
import { fileURLToPath } from 'node:url';

const perfDir = new URL('./', import.meta.url);
const files = await readdir(new URL('./', import.meta.url));
const fixtures = files.filter(f => f.endsWith('.json') && !f.endsWith('.traceCache.json'));

for (const fixture of fixtures) {
  const name = fixture.replace(/\.json$/, '');
  const data = await (await fetch(new URL(fixture, perfDir), {})).json();

  if (fixture.endsWith('.install.json')) {
    test(name, () => runInstallTest(name, data));
  } else if (fixture.endsWith('.link.json')) {
    test(name, () => runLinkTest(name, data));

    const traceCacheFile = new URL(fixture.replace('.link.json', '.link.traceCache.json'), perfDir);
    try {
      const cached = JSON.parse(readFileSync(fileURLToPath(traceCacheFile), 'utf-8'));
      test(name + '.traceCached', () => runTraceCachedTest(name, data, cached));
    } catch {}
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
      viem: '2.46.0'
    }
  };

  {
    const generator = new Generator(generatorOpts);
    const start = performance.now();
    await generator.install(installs);
    console.log(`PERF TEST TIME (uncached): ${performance.now() - start}ms`);
  }

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

  {
    const generator = new Generator({ ...generatorOpts, traceCache });
    const start = performance.now();
    await generator.install(installs);
    console.log(`PERF TEST TIME (trace cached): ${performance.now() - start}ms`);
  }
}

async function runTraceCachedTest(name, linkOpts, traceCache) {
  const { inputMap, entryPoints, ignoreList, resolutions, ...rest } = linkOpts;

  const generatorOpts = {
    defaultProvider: 'jspm.io',
    env: ['browser', 'development', 'module'],
    inputMapFallbacks: 'semver-compatible',
    scopedLink: true,
    inputMap,
    ...(ignoreList ? { ignore: ignoreList } : {}),
    ...(resolutions && Object.keys(resolutions).length ? { resolutions } : {}),
    ...rest
  };

  const specifiers = entryPoints || Object.keys(inputMap?.imports || {});

  const generator = new Generator({ ...generatorOpts, traceCache });
  const start = performance.now();
  await generator.link(specifiers);
  generator.getMap();
  console.log(`PERF TEST TIME (trace cached): ${performance.now() - start}ms`);
}

async function runLinkTest(name, linkOpts) {
  const { inputMap, entryPoints, ignoreList, resolutions, ...rest } = linkOpts;

  const generatorOpts = {
    defaultProvider: 'jspm.io',
    env: ['browser', 'development', 'module'],
    inputMapFallbacks: 'semver-compatible',
    scopedLink: true,
    inputMap,
    ...(ignoreList ? { ignore: ignoreList } : {}),
    ...(resolutions && Object.keys(resolutions).length ? { resolutions } : {}),
    ...rest
  };

  const specifiers = entryPoints || Object.keys(inputMap?.imports || {});

  {
    const generator = new Generator(generatorOpts);
    const start = performance.now();
    await generator.link(specifiers);
    console.log(`PERF TEST TIME (uncached): ${performance.now() - start}ms`);
  }

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

    if (process.env.SAVE_TRACE_CACHE) {
      const cachePath = fileURLToPath(new URL(name + '.traceCache.json', perfDir));
      await writeFile(cachePath, JSON.stringify(traceCache));
      console.log(`Saved trace cache to ${cachePath}`);
    }
  }

  {
    const generator = new Generator({ ...generatorOpts, traceCache });
    const start = performance.now();
    await generator.link(specifiers);
    console.log(`PERF TEST TIME (trace cached): ${performance.now() - start}ms`);
  }
}
