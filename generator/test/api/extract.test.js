import { Generator } from '@jspm/generator';
import assert from 'assert';

const inputMap = {
  imports: {
    '@babel/core': 'https://ga.jspm.io/npm:@babel/core@7.26.10/lib/index.js',
    react: 'https://ga.jspm.io/npm:react@17.0.1/dev.index.js',
    'react-dom': 'https://ga.jspm.io/npm:react-dom@17.0.1/dev.index.js'
  },
  scopes: {
    'https://ga.jspm.io/': {
      // local import extraction
      '#lib/config/files/index.js': 'https://ga.jspm.io/npm:@babel/core@7.26.10/lib/config/files/index-browser.js',
      '#lib/config/resolve-targets.js': 'https://ga.jspm.io/npm:@babel/core@7.26.10/lib/config/resolve-targets-browser.js',
      '#lib/transform-file.js': 'https://ga.jspm.io/npm:@babel/core@7.26.10/lib/transform-file-browser.js',
      '#node.js': 'https://ga.jspm.io/npm:browserslist@4.26.3/browser.js',
      '@ampproject/remapping': 'https://ga.jspm.io/npm:@ampproject/remapping@2.3.0/dist/remapping.umd.js',
      '@babel/code-frame': 'https://ga.jspm.io/npm:@babel/code-frame@7.27.1/lib/index.js',
      // subpath extraction
      '@babel/compat-data/': 'https://ga.jspm.io/npm:@babel/compat-data@7.28.0/',
      '@babel/generator': 'https://ga.jspm.io/npm:@babel/generator@7.28.3/lib/index.js',
      '@babel/helper-compilation-targets': 'https://ga.jspm.io/npm:@babel/helper-compilation-targets@7.27.2/lib/index.js',
      '@babel/helper-globals/data/builtin-lower.json': 'https://ga.jspm.io/npm:@babel/helper-globals@7.28.0/data/builtin-lower.json.js',
      '@babel/helper-globals/data/builtin-upper.json': 'https://ga.jspm.io/npm:@babel/helper-globals@7.28.0/data/builtin-upper.json.js',
      '@babel/helper-module-imports': 'https://ga.jspm.io/npm:@babel/helper-module-imports@7.27.1/lib/index.js',
      '@babel/helper-module-transforms': 'https://ga.jspm.io/npm:@babel/helper-module-transforms@7.28.3/lib/index.js',
      '@babel/helper-string-parser': 'https://ga.jspm.io/npm:@babel/helper-string-parser@7.27.1/lib/index.js',
      '@babel/helper-validator-identifier': 'https://ga.jspm.io/npm:@babel/helper-validator-identifier@7.27.1/lib/index.js',
      '@babel/helper-validator-option': 'https://ga.jspm.io/npm:@babel/helper-validator-option@7.27.1/lib/index.js',
      '@babel/helpers': 'https://ga.jspm.io/npm:@babel/helpers@7.28.4/lib/index.js',
      '@babel/parser': 'https://ga.jspm.io/npm:@babel/parser@7.28.4/lib/index.js',
      '@babel/template': 'https://ga.jspm.io/npm:@babel/template@7.27.2/lib/index.js',
      '@babel/traverse': 'https://ga.jspm.io/npm:@babel/traverse@7.28.4/lib/index.js',
      '@babel/types': 'https://ga.jspm.io/npm:@babel/types@7.28.4/lib/index.js',
      '@jridgewell/gen-mapping': 'https://ga.jspm.io/npm:@jridgewell/gen-mapping@0.3.13/dist/gen-mapping.umd.js',
      '@jridgewell/resolve-uri': 'https://ga.jspm.io/npm:@jridgewell/resolve-uri@3.1.2/dist/resolve-uri.umd.js',
      '@jridgewell/sourcemap-codec': 'https://ga.jspm.io/npm:@jridgewell/sourcemap-codec@1.5.5/dist/sourcemap-codec.umd.js',
      '@jridgewell/trace-mapping': 'https://ga.jspm.io/npm:@jridgewell/trace-mapping@0.3.31/dist/trace-mapping.umd.js',
      'assert': 'https://ga.jspm.io/npm:@jspm/core@2.1.0/nodelibs/browser/assert.js',
      'baseline-browser-mapping': 'https://ga.jspm.io/npm:baseline-browser-mapping@2.8.12/dist/index.cjs',
      'browserslist': 'https://ga.jspm.io/npm:browserslist@4.26.3/index.js',
      'buffer': 'https://ga.jspm.io/npm:@jspm/core@2.1.0/nodelibs/browser/buffer.js',
      'caniuse-lite/dist/unpacker/agents': 'https://ga.jspm.io/npm:caniuse-lite@1.0.30001748/dist/unpacker/agents.js',
      'convert-source-map': 'https://ga.jspm.io/npm:convert-source-map@2.0.0/index.js',
      'debug': 'https://ga.jspm.io/npm:debug@4.4.3/src/browser.js',
      'electron-to-chromium/versions': 'https://ga.jspm.io/npm:electron-to-chromium@1.5.230/versions.js',
      'fs': 'https://ga.jspm.io/npm:@jspm/core@2.1.0/nodelibs/browser/fs.js',
      'gensync': 'https://ga.jspm.io/npm:gensync@1.0.0-beta.2/index.js',
      'js-tokens': 'https://ga.jspm.io/npm:js-tokens@4.0.0/index.js',
      'jsesc': 'https://ga.jspm.io/npm:jsesc@3.1.0/jsesc.js',
      'lru-cache': 'https://ga.jspm.io/npm:lru-cache@5.1.1/index.js',
      'ms': 'https://ga.jspm.io/npm:ms@2.1.3/index.js',
      'node-releases/data/processed/envs.json': 'https://ga.jspm.io/npm:node-releases@2.0.23/data/processed/envs.json.js',
      'node-releases/data/release-schedule/release-schedule.json': 'https://ga.jspm.io/npm:node-releases@2.0.23/data/release-schedule/release-schedule.json.js',
      'path': 'https://ga.jspm.io/npm:@jspm/core@2.1.0/nodelibs/browser/path.js',
      'picocolors': 'https://ga.jspm.io/npm:picocolors@1.1.1/picocolors.browser.js',
      'process': 'https://ga.jspm.io/npm:@jspm/core@2.1.0/nodelibs/browser/process-production.js',
      'semver': 'https://ga.jspm.io/npm:semver@6.3.1/semver.js',
      'yallist': 'https://ga.jspm.io/npm:yallist@3.1.1/yallist.js',
      'object-assign': 'https://ga.jspm.io/npm:object-assign@4.1.0/index.js',
      'scheduler': 'https://ga.jspm.io/npm:scheduler@0.20.1/dev.index.js',
      'scheduler/tracing': 'https://ga.jspm.io/npm:scheduler@0.20.1/dev.tracing.js'
    }
  }
};

{
  const generator = new Generator({
    inputMap,
    mapUrl: import.meta.url,
    defaultProvider: 'jspm.io',
    env: ['production', 'browser'],
    freeze: true
  });

  const { map } = await generator.extractMap('react');

  assert.strictEqual(map.imports.react, 'https://ga.jspm.io/npm:react@17.0.1/index.js');
  assert.strictEqual(
    map.scopes['https://ga.jspm.io/']['object-assign'],
    'https://ga.jspm.io/npm:object-assign@4.1.0/index.js'
  );
  assert.strictEqual(Object.keys(map.imports).length, 1);
  assert.strictEqual(Object.keys(map.scopes['https://ga.jspm.io/']).length, 1);
}

{
  // custom scope respected
  inputMap.scopes['https://ga.jspm.io/']['#node.js'] = 'https://custom.com/foo.js';

  const generator = new Generator({
    inputMap,
    mapUrl: import.meta.url,
    defaultProvider: 'jspm.io',
    env: ['production', 'browser'],
    combineSubpaths: true,
    freeze: true
  });

  const { map } = await generator.extractMap('@babel/core');

  assert.strictEqual(map.imports['@babel/core'], 'https://ga.jspm.io/npm:@babel/core@7.26.10/lib/index.js');
  assert.strictEqual(Object.keys(map.imports).length, 1);
  assert.strictEqual(inputMap.scopes['https://ga.jspm.io/']['#node.js'], 'https://custom.com/foo.js');
  assert.strictEqual(map.scopes['https://ga.jspm.io/']['@babel/compat-data/native-modules'], 'https://ga.jspm.io/npm:@babel/compat-data@7.28.0/native-modules.js');
}
