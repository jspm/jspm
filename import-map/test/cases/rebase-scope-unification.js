import { deepStrictEqual } from 'assert';
import { ImportMap } from '@jspm/import-map';

// Test case for scope unification during rebase
// When multiple scopes rebase to the same URL, they should be unified
const map = new ImportMap({
  mapUrl: 'file:///C:/Users/Guy/AppData/Local/Temp/jspm-yaQepn/',
  rootUrl: null,
  map: {
    imports: {
      'jspm-test123/sandbox': 'file:///C:/Users/Guy/AppData/Local/Temp/jspm-yaQepn/lib/sandbox.js'
    },
    scopes: {
      './': {
        'codemirror/mode/': 'https://ga.jspm.io/npm:codemirror@5.59.4/mode/'
      },
      'https://ga.jspm.io/': {
        '#fetch': 'https://ga.jspm.io/npm:@jspm/generator@2.6.2/dist/fetch-native.js',
        '#lib/config/files/index.js': 'https://ga.jspm.io/npm:@babel/core@7.26.10/lib/config/files/index-browser.js',
        '#lib/config/resolve-targets.js': 'https://ga.jspm.io/npm:@babel/core@7.26.10/lib/config/resolve-targets-browser.js',
        '#lib/internal/streams/stream.js': 'https://ga.jspm.io/npm:readable-stream@2.3.8/lib/internal/streams/stream-browser.js',
        '#lib/pass-through-decoder.js': 'https://ga.jspm.io/npm:text-decoder@1.2.2/lib/browser-decoder.js',
        '#lib/transform-file.js': 'https://ga.jspm.io/npm:@babel/core@7.26.10/lib/transform-file-browser.js',
        '#lib/utf8-decoder.js': 'https://ga.jspm.io/npm:text-decoder@1.2.2/lib/browser-decoder.js',
        '#node.js': 'https://ga.jspm.io/npm:browserslist@4.25.0/browser.js'
      },
      'file:///C:/Users/Guy/AppData/Local/Temp/jspm-yaQepn/': {
        'codemirror/mode/css/css.js': 'https://ga.jspm.io/npm:codemirror@5.59.4/mode/css/css.js',
        'codemirror/mode/htmlmixed/htmlmixed.js': 'https://ga.jspm.io/npm:codemirror@5.59.4/mode/htmlmixed/htmlmixed.js',
        'codemirror/mode/javascript/javascript.js': 'https://ga.jspm.io/npm:codemirror@5.59.4/mode/javascript/javascript.js',
        'codemirror/mode/xml/xml.js': 'https://ga.jspm.io/npm:codemirror@5.59.4/mode/xml/xml.js',
        '@jspm/core/nodelibs/buffer': 'https://ga.jspm.io/npm:@jspm/core@2.1.0/nodelibs/browser/buffer.js',
        '@jspm/core/nodelibs/zlib': 'https://ga.jspm.io/npm:@jspm/core@2.1.0/nodelibs/browser/zlib.js',
        '@jspm/generator': 'https://ga.jspm.io/npm:@jspm/generator@2.6.3/dist/generator.js',
        'codemirror': 'https://ga.jspm.io/npm:codemirror@5.59.4/lib/codemirror.js',
        'lit-element': 'https://ga.jspm.io/npm:lit-element@4.2.1/index.js'
      }
    }
  }
});

// Rebase to about:blank - this should unify the './' and 'file:///C:/Users/Guy/AppData/Local/Temp/jspm-yaQepn/' scopes
// since they both resolve to the same URL
map.rebase('about:blank');

const result = map.toJSON();

// The scopes for 'file:///C:/Users/Guy/AppData/Local/Temp/jspm-yaQepn/' should be unified
// Both './' and the full file URL should resolve to the same scope after rebasing
const expectedScopeUrl = 'file:///C:/Users/Guy/AppData/Local/Temp/jspm-yaQepn/';

// Check that we have the unified scope
if (!result.scopes[expectedScopeUrl]) {
  throw new Error(`Expected scope for ${expectedScopeUrl} not found`);
}

const unifiedScope = result.scopes[expectedScopeUrl];

// The unified scope should contain entries from both original scopes
const expectedEntries = {
  // From './' scope
  'codemirror/mode/': 'https://ga.jspm.io/npm:codemirror@5.59.4/mode/',
  // From 'file:///C:/Users/Guy/AppData/Local/Temp/jspm-yaQepn/' scope
  'codemirror/mode/css/css.js': 'https://ga.jspm.io/npm:codemirror@5.59.4/mode/css/css.js',
  'codemirror/mode/htmlmixed/htmlmixed.js': 'https://ga.jspm.io/npm:codemirror@5.59.4/mode/htmlmixed/htmlmixed.js',
  'codemirror/mode/javascript/javascript.js': 'https://ga.jspm.io/npm:codemirror@5.59.4/mode/javascript/javascript.js',
  'codemirror/mode/xml/xml.js': 'https://ga.jspm.io/npm:codemirror@5.59.4/mode/xml/xml.js',
  '@jspm/core/nodelibs/buffer': 'https://ga.jspm.io/npm:@jspm/core@2.1.0/nodelibs/browser/buffer.js',
  '@jspm/core/nodelibs/zlib': 'https://ga.jspm.io/npm:@jspm/core@2.1.0/nodelibs/browser/zlib.js',
  '@jspm/generator': 'https://ga.jspm.io/npm:@jspm/generator@2.6.3/dist/generator.js',
  'codemirror': 'https://ga.jspm.io/npm:codemirror@5.59.4/lib/codemirror.js',
  'lit-element': 'https://ga.jspm.io/npm:lit-element@4.2.1/index.js'
};

// Verify all expected entries are present
for (const [key, value] of Object.entries(expectedEntries)) {
  if (unifiedScope[key] !== value) {
    throw new Error(`Expected unified scope to contain ${key}: ${value}, but got ${unifiedScope[key]}`);
  }
}
