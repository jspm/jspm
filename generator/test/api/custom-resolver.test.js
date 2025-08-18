import { Generator } from '@jspm/generator';
import assert from 'assert';

{
  const customMappings = {
    'my-custom-lib': 'https://ga.jspm.io/npm:lodash@4.17.21/lodash.js',
    'another-lib': 'https://ga.jspm.io/npm:semver@7.5.4/index.js'
  };

  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'jspm.io',
    env: ['production', 'browser'],
    customResolver: async (specifier, parentUrl, context) => {
      if (customMappings[specifier]) {
        return customMappings[specifier];
      }
      return undefined;
    }
  });

  await generator.link(['my-custom-lib', 'another-lib']);
  await generator.install('react@16');
  const json = generator.getMap();

  assert.strictEqual(
    json.imports['my-custom-lib'],
    'https://ga.jspm.io/npm:lodash@4.17.21/lodash.js'
  );
  assert.strictEqual(json.imports['another-lib'], 'https://ga.jspm.io/npm:semver@7.5.4/index.js');

  assert.strictEqual(json.imports.react, 'https://ga.jspm.io/npm:react@16.14.0/index.js');
}

{
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'jspm.io',
    env: ['production', 'browser'],
    customResolver: async (specifier, parentUrl, context) => {
      return undefined;
    }
  });

  await generator.install('react@17');
  const json = generator.getMap();

  assert.strictEqual(json.imports.react, 'https://ga.jspm.io/npm:react@17.0.2/index.js');
}

{
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'jspm.io',
    env: ['development', 'browser'],
    customResolver: async (specifier, parentUrl, context) => {
      if (specifier === 'debug-lib' && context.env?.includes('development')) {
        return 'https://ga.jspm.io/npm:debug@4.3.4/src/browser.js';
      }
      if (specifier === 'debug-lib' && context.env?.includes('production')) {
        return 'https://ga.jspm.io/npm:debug@4.3.4/src/index.js';
      }
      return undefined;
    }
  });

  await generator.link('debug-lib');
  const json = generator.getMap();

  assert.strictEqual(
    json.imports['debug-lib'],
    'https://ga.jspm.io/npm:debug@4.3.4/src/browser.js'
  );
}

{
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'jspm.io',
    env: ['production', 'browser'],
    customResolver: async (specifier, parentUrl, context) => {
      if (specifier === 'dep') {
        return './local/assets/file.js';
      }
      return undefined;
    }
  });

  await generator.install({ target: './local/pkg', subpath: './withdep' });
  const json = generator.getMap();

  assert.strictEqual(json.imports['localpkg/withdep'], './local/pkg/b.js');
  assert.strictEqual(json.scopes['./local/pkg/'].dep, './local/assets/file.js');
}

{
  let resolverCalls = [];

  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'jspm.io',
    env: ['production', 'browser'],
    customResolver: async (specifier, parentUrl, context) => {
      resolverCalls.push({ specifier, parentUrl });

      if (specifier === 'my-lib') {
        return 'https://ga.jspm.io/npm:ms@2.1.3/index.js';
      }
      return undefined;
    }
  });

  await generator.link('my-lib');

  assert(resolverCalls.some(call => call.specifier === 'my-lib'));
}

{
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'jspm.io',
    env: ['production', 'browser'],
    customResolver: async (specifier, parentUrl, context) => {
      if (specifier === 'error-pkg') {
        throw new Error('Custom resolver error');
      }
      return undefined;
    }
  });

  let errorThrown = false;
  try {
    await generator.link('error-pkg');
  } catch (e) {
    errorThrown = true;
    assert(e.message.includes('Custom resolver error'));
  }
  assert(errorThrown, 'Expected error to be thrown');
}

{
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'jspm.io',
    env: ['production', 'browser'],
    customResolver: async (specifier, parentUrl, context) => {
      if (specifier === '@myorg/private-pkg') {
        return 'https://ga.jspm.io/npm:@babel/core@7.24.7/lib/index.js';
      }
      return undefined;
    }
  });

  await generator.link('@myorg/private-pkg');
  const json = generator.getMap();

  assert.strictEqual(
    json.imports['@myorg/private-pkg'],
    'https://ga.jspm.io/npm:@babel/core@7.24.7/lib/index.js'
  );
}
