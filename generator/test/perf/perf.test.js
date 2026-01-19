import { clearCache, Generator } from '@jspm/generator';
import assert from 'assert';
import { fetch } from '../../lib/common/fetch.js';

const largeInstallSet = await (
  await fetch(new URL('./large-install-set.json', import.meta.url), {})
).json();

// First, prime the fetch cache so we are not testing the network as much as possible
{
  const generator = new Generator({
    defaultProvider: 'jspm.io',
    resolutions: {
      react: '16.14.0',
      porto: '0.0.93'
    }
  });
  const installs = Object.entries(largeInstallSet).map(([name, versionRange]) => ({
    target: name + '@' + versionRange
  }));
  const start = performance.now();
  await generator.install(installs);
  console.log(`PERF TEST TIME (uncached): ${performance.now() - start}ms`);
}

// Then we do the actual perf test run
{
  const generator = new Generator({
    defaultProvider: 'jspm.io',
    resolutions: {
      react: '16.14.0',
      porto: '0.0.93'
    }
  });

  const installs = Object.entries(largeInstallSet).map(([name, versionRange]) => ({
    target: name + '@' + versionRange
  }));

  const start = performance.now();
  await generator.install(installs);

  console.log(`PERF TEST TIME (cached): ${performance.now() - start}ms`);
}
