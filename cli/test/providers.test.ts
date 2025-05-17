import { test } from 'node:test';
import assert from 'assert';
import { availableProviders } from '../src/utils.ts';
import { mapDirectory, mapFile, run } from './scenarios.ts';

test('Swapping providers with a reinstall', async () => {
  // Scenario that checks we can swap providers with a reinstall:
  await run({
    files: await mapDirectory('fixtures/scenario_provider_swap'),
    commands: [`jspm link -m importmap.json --provider nodemodules`],
    validationFn: async files => {
      const map = files.get('importmap.json');
      assert(!!map);
      assert(!map.includes('jspm.io'));
    }
  });
});

test('Provider auto-detection from initial map', async () => {
  // Scenario that checks the provider is auto-detected from the initial map:
  await run({
    files: await mapFile('fixtures/unpkg.importmap.json'),
    commands: [`jspm link -m unpkg.importmap.json -o importmap.json`],
    validationFn: async files => {
      const map = files.get('importmap.json');
      assert(!!map);
      assert(!map.includes('jspm.io'));
    }
  });
});

// Scenarios that check we can use each available provider:
for (const provider of availableProviders) {
  if (provider === 'esm.sh') {
    /*
      Disabling esm.sh provider for now. There is a bug for installing lit.
      https://github.com/jspm/generator/issues/335
    */
    continue;
  }

  test(`Using provider: ${provider}`, async () => {
    let name = 'lit';
    if (provider === 'node') {
      name = '@jspm/core/nodelibs/fs';
    }
    if (provider === 'nodemodules') {
      name = 'lit';
    }

    const files = await mapDirectory('fixtures/scenario_providers');

    // Setup a package.json with appropriate exports and dependencies for testing
    const pjson = JSON.parse(files.get('package.json') || '{}');
    if (!pjson.name) pjson.name = 'test-project';
    if (!pjson.exports) pjson.exports = { './index.js': './index.js' };
    if (!pjson.dependencies) pjson.dependencies = {};
    pjson.dependencies[name] = '*';
    files.set('package.json', JSON.stringify(pjson, null, 2));

    // Add a test file that imports the module
    files.set('index.js', `import "${name}";\nexport default {};`);

    await run({
      files,
      commands: [
        `jspm install ./fixtures/scenario_providers -p ${provider} -C production -m importmap.json`
      ],
      validationFn: async (files: Map<string, string>) => {
        const map = JSON.parse(files.get('importmap.json') ?? '{}');
        assert(map?.scopes?.['./']?.[name]);
      }
    });
  });
}
