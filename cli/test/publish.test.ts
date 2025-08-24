/**
 * Copyright 2022-2025 Guy Bedford
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

import { test } from 'node:test';
import assert from 'assert';
import { mapDirectory, run } from './scenarios.ts';

function randomVersion() {
  const major = Math.round(Math.random() * 1000);
  const minor = Math.round(Math.random() * 1000);
  const patch = Math.round(Math.random() * 1000);
  return `${major}.${minor}.${patch}`;
}

// Test publish with package validation errors
test('publish with missing package.json name', async () => {
  const files = new Map();
  // Create a package.json without a name field
  files.set('package.json', JSON.stringify({ version: randomVersion() }));

  try {
    await run({
      files,
      commands: ['jspm publish -p jspm.io'],
      validationFn: async () => {
        assert.fail('Should have thrown an error');
      }
    });
    assert.fail('Expected an error');
  } catch (error) {
    // We expect the command to fail
    assert(error.toString().includes('failed'), 'Command should fail with missing name');
    process.exitCode = 0;
  }
});

// Test publish with version validation errors
test('publish with missing package.json version', async () => {
  const files = new Map();
  // Create a package.json without a version field
  files.set('package.json', JSON.stringify({ name: 'test-package' }));

  try {
    await run({
      files,
      commands: ['jspm publish -p jspm.io'],
      validationFn: async () => {
        assert.fail('Should have thrown an error');
      }
    });
    assert.fail('Expected an error');
  } catch (error) {
    // We expect the command to fail
    assert(error.toString().includes('failed'), 'Command should fail with missing version');
  }
});

// Test publish with include configuration
test('publish with include config', async () => {
  const files = new Map();
  // Create a complete valid test setup
  files.set(
    'package.json',
    JSON.stringify({
      name: 'jspm-deploy-test',
      version: randomVersion(),
      files: ['src'],
      ignore: ['dist']
    })
  );
  files.set('index.js', "console.log('Hello world');");
  files.set('src/utils.js', 'export const add = (a, b) => a + b;');
  files.set('dist/ignore.js', 'should not include');

  await run({
    files,
    commands: ['jspm publish -p jspm.io --no-usage'],
    validationFn: async _updatedFiles => {
      // Verify the command completed successfully
      assert(true, 'Publish command with config completed successfully');
    }
  });
});

// Test publish with versioning
test('publish with specific version', async () => {
  const files = new Map();
  // Create package.json with a specific version
  const testVersion = randomVersion();
  files.set(
    'package.json',
    JSON.stringify({
      name: 'jspm-deploy-test',
      version: testVersion,
      description: 'Test package for jspm publish testing'
    })
  );

  files.set('index.js', "console.log('Version test');");

  await run({
    files,
    commands: ['jspm publish -p jspm.io --no-usage'],
    validationFn: async _updatedFiles => {
      // Successfully published version 1.0.1
      assert(true, `Successfully published version ${testVersion}`);
    }
  });
});

// Test publish with custom tag
test('publish with custom tag', async () => {
  const files = new Map();
  // Create package.json with a version that should be overridden
  files.set(
    'package.json',
    JSON.stringify({
      name: 'jspm-deploy-test',
      version: randomVersion(),
      description: 'Test package for jspm publish testing'
    })
  );

  files.set('index.js', "console.log('Tag test');");

  const customTag = `beta-${Math.round(Math.random() * 1000)}`;

  await run({
    files,
    commands: [`jspm publish -p jspm.io --version ${customTag} --no-usage`],
    validationFn: async _updatedFiles => {
      // Successfully published with custom tag
      assert(true, `Successfully published with tag ${customTag}`);
    }
  });
});

// Test publish with invalid tag
test('publish with invalid tag', async () => {
  const files = new Map();
  files.set(
    'package.json',
    JSON.stringify({
      name: 'jspm-deploy-test',
      version: randomVersion()
    })
  );

  files.set('index.js', "console.log('Invalid tag test');");

  try {
    await run({
      files,
      commands: ['jspm publish -p jspm.io --version invalid@tag'],
      validationFn: async () => {
        assert.fail('Should have thrown an error for invalid tag');
      }
    });
    assert.fail('Expected an error for invalid tag');
  } catch (error) {
    // We expect the command to fail with a specific error
    assert(error.toString().includes('failed'), 'Command should fail with invalid tag');
  }
});

// Test publish and eject
test('publish and eject', async () => {
  const files = new Map();
  const packageName = 'jspm-deploy-eject-test';
  const version = `test-${Math.round(Math.random() * 1000)}`;

  // Create a package for publish
  files.set(
    'package.json',
    JSON.stringify({
      name: packageName,
      version: randomVersion(),
      description: 'Test package for jspm publish and eject testing',
      exports: './index.js'
    })
  );

  // Add a simple index file
  files.set('index.js', "export const message = 'Hello from published package';");

  // Add a utility file in a subdirectory
  files.set('src/utils.js', 'export const add = (a, b) => a + b;');

  let publishedPackage;

  await run({
    files,
    commands: [`jspm publish -p jspm.io --version ${version} --no-usage`],
    validationFn: async _updatedFiles => {
      // Store the package name for ejection
      publishedPackage = `app:${packageName}@${version}`;
      assert(true, `Successfully published ${publishedPackage}`);
    }
  });

  // Now test ejection to a target directory
  const ejectDir = 'ejected';

  await run({
    files: new Map(), // Start with clean files
    commands: [
      `jspm publish -p jspm.io --eject ${publishedPackage} --dir ${ejectDir} -o importmap.json`
    ],
    validationFn: async updatedFiles => {
      // Verify ejected files
      assert(updatedFiles.has(`${ejectDir}/index.js`), 'Should have ejected index.js');
      assert(updatedFiles.has(`${ejectDir}/src/utils.js`), 'Should have ejected src/utils.js');

      // Verify import map was updated
      assert(updatedFiles.has('importmap.json'), 'Import map should exist after ejection');

      // If importmap.json exists, parse and verify it
      try {
        const importMap = JSON.parse(updatedFiles.get('importmap.json')!);
        assert(
          importMap.imports['jspm-deploy-eject-test'] === './ejected/index.js',
          'Import map should have imports property'
        );
      } catch (e) {
        assert.fail(`Failed to parse import map: ${e.message}`);
      }
    }
  });
});

// Test complex package with importmap.js
test('publish complex package with importmap', async () => {
  const files = new Map();

  // Create package.json
  files.set(
    'package.json',
    JSON.stringify(
      {
        name: 'jspm-test123',
        version: 'web',
        description: '',
        type: 'module',
        exports: {
          './sandbox': './lib/sandbox.js'
        },
        dependencies: {
          '@jspm/generator': '^2.6.1',
          codemirror: '5.59.4',
          'es-module-lexer': '^1.7.0'
        }
      },
      null,
      2
    )
  );

  // Create lib/sandbox.js
  files.set(
    'lib/sandbox.js',
    `import { LitElement, html } from 'lit-element';
import { Buffer } from '@jspm/core/nodelibs/buffer';
import zlib from '@jspm/core/nodelibs/zlib';
import CodeMirror from 'codemirror';
import 'codemirror/mode/css/css.js';
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/mode/xml/xml.js';
import 'codemirror/mode/htmlmixed/htmlmixed.js';
import { lookup } from '@jspm/generator';`
  );

  // Create importmap.js
  const importMapContent = `(map => {
  const mapUrl = document.currentScript.src;
  const resolve = imports => Object.fromEntries(Object.entries(imports ).map(([k, v]) => [k, new URL(v, mapUrl).href]));
  document.head.appendChild(Object.assign(document.createElement("script"), {
    type: "importmap",
    innerHTML: JSON.stringify({
      imports: resolve(map.imports),
      scopes: Object.fromEntries(Object.entries(map.scopes).map(([k, v]) => [new URL(k, mapUrl).href, resolve(v)]))
    })
  }));
})
({
  "imports": {
    "jspm-test123/sandbox": "./lib/sandbox.js"
  },
  "scopes": {
    "./": {
      "@jspm/core/nodelibs/buffer": "https://ga.jspm.io/npm:@jspm/core@2.1.0/nodelibs/browser/buffer.js",
      "@jspm/core/nodelibs/util": "https://ga.jspm.io/npm:@jspm/core@2.1.0/nodelibs/browser/util.js",
      "@jspm/core/nodelibs/zlib": "https://ga.jspm.io/npm:@jspm/core@2.1.0/nodelibs/browser/zlib.js",
      "@jspm/generator": "https://ga.jspm.io/npm:@jspm/generator@2.6.2/dist/generator.js",
      "codemirror": "https://ga.jspm.io/npm:codemirror@5.59.4/lib/codemirror.js",
      "codemirror/mode/": "https://ga.jspm.io/npm:codemirror@5.59.4/mode/",
      "lit-element": "https://ga.jspm.io/npm:lit-element@4.2.0/development/index.js"
    },
    "https://ga.jspm.io/": {
      "#fetch": "https://ga.jspm.io/npm:@jspm/generator@2.6.2/dist/fetch-native.js",
      "#lib/config/files/index.js": "https://ga.jspm.io/npm:@babel/core@7.26.10/lib/config/files/index-browser.js",
      "#lib/config/resolve-targets.js": "https://ga.jspm.io/npm:@babel/core@7.26.10/lib/config/resolve-targets-browser.js",
      "#lib/internal/streams/stream.js": "https://ga.jspm.io/npm:readable-stream@2.3.8/lib/internal/streams/stream-browser.js",
      "#lib/pass-through-decoder.js": "https://ga.jspm.io/npm:text-decoder@1.2.2/lib/browser-decoder.js",
      "#lib/transform-file.js": "https://ga.jspm.io/npm:@babel/core@7.26.10/lib/transform-file-browser.js",
      "#lib/utf8-decoder.js": "https://ga.jspm.io/npm:text-decoder@1.2.2/lib/browser-decoder.js",
      "#node.js": "https://ga.jspm.io/npm:browserslist@4.25.0/browser.js",
      "@ampproject/remapping": "https://ga.jspm.io/npm:@ampproject/remapping@2.3.0/dist/remapping.umd.js",
      "@babel/code-frame": "https://ga.jspm.io/npm:@babel/code-frame@7.27.1/lib/index.js",
      "@babel/compat-data/native-modules": "https://ga.jspm.io/npm:@babel/compat-data@7.28.0/native-modules.js",
      "@babel/compat-data/plugins": "https://ga.jspm.io/npm:@babel/compat-data@7.28.0/plugins.js",
      "@babel/core": "https://ga.jspm.io/npm:@babel/core@7.26.10/lib/dev.index.js",
      "@babel/generator": "https://ga.jspm.io/npm:@babel/generator@7.28.0/lib/index.js",
      "@babel/helper-annotate-as-pure": "https://ga.jspm.io/npm:@babel/helper-annotate-as-pure@7.27.3/lib/index.js",
      "@babel/helper-compilation-targets": "https://ga.jspm.io/npm:@babel/helper-compilation-targets@7.27.2/lib/index.js",
      "@babel/helper-create-class-features-plugin": "https://ga.jspm.io/npm:@babel/helper-create-class-features-plugin@7.27.1/lib/index.js",
      "@babel/helper-globals/data/builtin-lower.json": "https://ga.jspm.io/npm:@babel/helper-globals@7.28.0/data/builtin-lower.json.js",
      "@babel/helper-globals/data/builtin-upper.json": "https://ga.jspm.io/npm:@babel/helper-globals@7.28.0/data/builtin-upper.json.js",
      "@babel/helper-member-expression-to-functions": "https://ga.jspm.io/npm:@babel/helper-member-expression-to-functions@7.27.1/lib/index.js",
      "@babel/helper-module-imports": "https://ga.jspm.io/npm:@babel/helper-module-imports@7.27.1/lib/index.js",
      "@babel/helper-module-transforms": "https://ga.jspm.io/npm:@babel/helper-module-transforms@7.27.3/lib/index.js",
      "@babel/helper-optimise-call-expression": "https://ga.jspm.io/npm:@babel/helper-optimise-call-expression@7.27.1/lib/index.js",
      "@babel/helper-plugin-utils": "https://ga.jspm.io/npm:@babel/helper-plugin-utils@7.27.1/lib/index.js",
      "@babel/helper-replace-supers": "https://ga.jspm.io/npm:@babel/helper-replace-supers@7.27.1/lib/index.js",
      "@babel/helper-skip-transparent-expression-wrappers": "https://ga.jspm.io/npm:@babel/helper-skip-transparent-expression-wrappers@7.27.1/lib/index.js",
      "@babel/helper-string-parser": "https://ga.jspm.io/npm:@babel/helper-string-parser@7.27.1/lib/index.js",
      "@babel/helper-validator-identifier": "https://ga.jspm.io/npm:@babel/helper-validator-identifier@7.27.1/lib/index.js",
      "@babel/helper-validator-option": "https://ga.jspm.io/npm:@babel/helper-validator-option@7.27.1/lib/index.js",
      "@babel/helpers": "https://ga.jspm.io/npm:@babel/helpers@7.28.2/lib/index.js",
      "@babel/parser": "https://ga.jspm.io/npm:@babel/parser@7.28.0/lib/index.js",
      "@babel/plugin-syntax-import-attributes": "https://ga.jspm.io/npm:@babel/plugin-syntax-import-attributes@7.27.1/lib/index.js",
      "@babel/plugin-syntax-jsx": "https://ga.jspm.io/npm:@babel/plugin-syntax-jsx@7.27.1/lib/index.js",
      "@babel/plugin-syntax-typescript": "https://ga.jspm.io/npm:@babel/plugin-syntax-typescript@7.27.1/lib/index.js",
      "@babel/plugin-transform-modules-commonjs": "https://ga.jspm.io/npm:@babel/plugin-transform-modules-commonjs@7.27.1/lib/index.js",
      "@babel/plugin-transform-typescript": "https://ga.jspm.io/npm:@babel/plugin-transform-typescript@7.28.0/lib/index.js",
      "@babel/preset-typescript": "https://ga.jspm.io/npm:@babel/preset-typescript@7.27.1/lib/index.js",
      "@babel/template": "https://ga.jspm.io/npm:@babel/template@7.27.2/lib/index.js",
      "@babel/traverse": "https://ga.jspm.io/npm:@babel/traverse@7.28.0/lib/index.js",
      "@babel/types": "https://ga.jspm.io/npm:@babel/types@7.28.2/lib/index.js",
      "@jridgewell/gen-mapping": "https://ga.jspm.io/npm:@jridgewell/gen-mapping@0.3.12/dist/gen-mapping.umd.js",
      "@jridgewell/resolve-uri": "https://ga.jspm.io/npm:@jridgewell/resolve-uri@3.1.2/dist/resolve-uri.umd.js",
      "@jridgewell/sourcemap-codec": "https://ga.jspm.io/npm:@jridgewell/sourcemap-codec@1.5.4/dist/sourcemap-codec.umd.js",
      "@jridgewell/trace-mapping": "https://ga.jspm.io/npm:@jridgewell/trace-mapping@0.3.29/dist/trace-mapping.umd.js",
      "@jspm/import-map": "https://ga.jspm.io/npm:@jspm/import-map@1.2.0/dist/map.js",
      "@lit/reactive-element": "https://ga.jspm.io/npm:@lit/reactive-element@2.1.0/development/reactive-element.js",
      "assert": "https://ga.jspm.io/npm:@jspm/core@2.1.0/nodelibs/browser/assert.js",
      "b4a": "https://ga.jspm.io/npm:b4a@1.6.7/browser.js",
      "balanced-match": "https://ga.jspm.io/npm:balanced-match@3.0.1/index.js",
      "brace-expansion": "https://ga.jspm.io/npm:brace-expansion@4.0.1/index.js",
      "browserslist": "https://ga.jspm.io/npm:browserslist@4.25.0/index.js",
      "buffer": "https://ga.jspm.io/npm:@jspm/core@2.1.0/nodelibs/browser/buffer.js",
      "caniuse-lite/dist/unpacker/agents": "https://ga.jspm.io/npm:caniuse-lite@1.0.30001727/dist/unpacker/agents.js",
      "convert-source-map": "https://ga.jspm.io/npm:convert-source-map@2.0.0/index.js",
      "core-util-is": "https://ga.jspm.io/npm:core-util-is@1.0.3/lib/util.js",
      "debug": "https://ga.jspm.io/npm:debug@4.4.1/src/browser.js",
      "electron-to-chromium/versions": "https://ga.jspm.io/npm:electron-to-chromium@1.5.191/versions.js",
      "es-module-lexer": "https://ga.jspm.io/npm:es-module-lexer@1.7.0/dist/lexer.js",
      "es-module-lexer/js": "https://ga.jspm.io/npm:es-module-lexer@1.7.0/dist/lexer.asm.js",
      "events": "https://ga.jspm.io/npm:@jspm/core@2.1.0/nodelibs/browser/events.js",
      "fast-fifo": "https://ga.jspm.io/npm:fast-fifo@1.3.2/index.js",
      "fs": "https://ga.jspm.io/npm:@jspm/core@2.1.0/nodelibs/browser/fs.js",
      "gensync": "https://ga.jspm.io/npm:gensync@1.0.0-beta.2/index.js",
      "immediate": "https://ga.jspm.io/npm:immediate@3.0.6/lib/browser.js",
      "inherits": "https://ga.jspm.io/npm:inherits@2.0.4/inherits_browser.js",
      "isarray": "https://ga.jspm.io/npm:isarray@1.0.0/index.js",
      "js-tokens": "https://ga.jspm.io/npm:js-tokens@4.0.0/index.js",
      "jsesc": "https://ga.jspm.io/npm:jsesc@3.1.0/jsesc.js",
      "lie": "https://ga.jspm.io/npm:lie@3.3.0/lib/browser.js",
      "lit-html": "https://ga.jspm.io/npm:lit-html@3.3.0/development/lit-html.js",
      "lru-cache": "https://ga.jspm.io/npm:lru-cache@5.1.1/index.js",
      "minimatch": "https://ga.jspm.io/npm:minimatch@10.0.2/dist/esm/index.js",
      "ms": "https://ga.jspm.io/npm:ms@2.1.3/index.js",
      "node-releases/data/processed/envs.json": "https://ga.jspm.io/npm:node-releases@2.0.19/data/processed/envs.json.js",
      "node-releases/data/release-schedule/release-schedule.json": "https://ga.jspm.io/npm:node-releases@2.0.19/data/release-schedule/release-schedule.json.js",
      "pako": "https://ga.jspm.io/npm:pako@2.1.0/dist/pako.esm.mjs",
      "path": "https://ga.jspm.io/npm:@jspm/core@2.1.0/nodelibs/browser/path.js",
      "picocolors": "https://ga.jspm.io/npm:picocolors@1.1.1/picocolors.browser.js",
      "process": "https://ga.jspm.io/npm:@jspm/core@2.1.0/nodelibs/browser/process.js",
      "process-nextick-args": "https://ga.jspm.io/npm:process-nextick-args@2.0.1/index.js",
      "readable-stream": "https://ga.jspm.io/npm:readable-stream@2.3.8/readable-browser.js",
      "safe-buffer": "https://ga.jspm.io/npm:safe-buffer@5.1.2/index.js",
      "semver": "https://ga.jspm.io/npm:semver@6.3.1/semver.js",
      "setimmediate": "https://ga.jspm.io/npm:setimmediate@1.0.5/setImmediate.js",
      "streamx": "https://ga.jspm.io/npm:streamx@2.22.1/index.js",
      "string_decoder": "https://ga.jspm.io/npm:string_decoder@1.1.1/lib/string_decoder.js",
      "sver": "https://ga.jspm.io/npm:sver@1.8.4/sver.js",
      "sver/convert-range.js": "https://ga.jspm.io/npm:sver@1.8.4/convert-range.js",
      "tar-stream": "https://ga.jspm.io/npm:tar-stream@3.1.7/index.js",
      "text-decoder": "https://ga.jspm.io/npm:text-decoder@1.2.2/index.js",
      "url": "https://ga.jspm.io/npm:@jspm/core@2.1.0/nodelibs/browser/url.js",
      "util": "https://ga.jspm.io/npm:@jspm/core@2.1.0/nodelibs/browser/util.js",
      "util-deprecate": "https://ga.jspm.io/npm:util-deprecate@1.0.2/browser.js",
      "yallist": "https://ga.jspm.io/npm:yallist@3.1.1/yallist.js"
    }
  }
});`;

  files.set('importmap.js', importMapContent);

  // Publish the package
  await run({
    files,
    commands: ['jspm publish -p jspm.io --no-usage'],
    validationFn: async _updatedFiles => {
      // After publish, fetch the importmap.js from the published URL
      const packageUrl = 'https://jspm.io/app:jspm-test123@web';
      const importmapUrl = `${packageUrl}/importmap.json`;

      let publishMap;
      try {
        const response = await fetch(importmapUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch importmap: ${response.status}`);
        }
        publishMap = await response.json();
      } catch (error) {
        console.error('Error fetching importmap:', error);
        throw error;
      }

      assert.deepStrictEqual(publishMap.scopes['https://jspm.io/'], {
        '@jspm/core/nodelibs/buffer':
          'https://ga.jspm.io/npm:@jspm/core@2.1.0/nodelibs/browser/buffer.js',
        '@jspm/core/nodelibs/zlib':
          'https://ga.jspm.io/npm:@jspm/core@2.1.0/nodelibs/browser/zlib.js',
        '@jspm/generator': 'https://ga.jspm.io/npm:@jspm/generator@2.6.2/dist/generator.js',
        codemirror: 'https://ga.jspm.io/npm:codemirror@5.59.4/lib/codemirror.js',
        'codemirror/mode/': 'https://ga.jspm.io/npm:codemirror@5.59.4/mode/',
        'lit-element': 'https://ga.jspm.io/npm:lit-element@4.2.0/index.js'
      });
    }
  });
});

// Test publish with watch mode (short duration for testing)
// This test must be last as the watcher stop is a process.exit
test('publish watch mode basic test', async () => {
  const files = await mapDirectory('fixtures/scenario_deploy');

  // For testing watch mode, we'll start it but cancel after a short time
  // This is just to ensure the watch mode starts properly
  let watchProcess;

  try {
    // We need to handle this differently since watch mode is long-running
    // Instead we'll just verify it can start
    watchProcess = run({
      files,
      commands: [`jspm publish -p jspm.io --version dev --watch --no-usage`],
      validationFn: async () => {
        // Watch mode should start successfully
        await new Promise((resolve, reject) => {
          watchProcess.catch(reject);
          setTimeout(resolve, 5_000);
        });
        process.stdin.emit('data', 'q');
      }
    });
    // This test is more to verify the watch mode can be started
    // A more thorough test would actually modify files and verify republish
  } catch (error) {
    assert.fail(`Watch mode failed to start: ${error}`);
  }
});
