import assert from 'assert';
import { ImportMap } from '@jspm/import-map';

{
  const map = new ImportMap({
    mapUrl: new URL("file:///test/map/"),
    rootUrl: new URL("file:///test/"),
    map: {
      scopes: {
        '/': {
          'react': 'https://ga.jspm.io/npm:react@18.2.0/index.js',
        }
      }
    }
  });

  map.flatten();
  assert(map.scopes && map.scopes["/"]);
}

{
  const map = new ImportMap({
    mapUrl: new URL(import.meta.url),
    map: {
      imports: {
        '@patternfly/pfe-core': '/assets/packages/@patternfly/pfe-core/core.js',
        '@rhds/tokens': '/assets/packages/@rhds/tokens/js/tokens.js',
        '@lit/reactive-element': '/assets/packages/@lit/reactive-element/reactive-element.js',
        lit: '/assets/packages/lit/index.js',
        '@patternfly/elements/pf-tooltip/pf-tooltip.js': '/assets/packages/@patternfly/elements/pf-tooltip/pf-tooltip.js',
        '@patternfly/pfe-core/controllers/roving-tabindex-controller.js': '/assets/packages/@patternfly/pfe-core/controllers/roving-tabindex-controller.js'
      },
      scopes: {
        '/assets/packages/@patternfly/elements/': {
          'lit/directives/class-map.js': '/assets/packages/lit/directives/class-map.js',
          '@floating-ui/dom': '/assets/packages/@floating-ui/dom/dist/floating-ui.dom.browser.min.mjs',
          '@patternfly/pfe-core/controllers/floating-dom-controller.js': '/assets/packages/@patternfly/pfe-core/controllers/floating-dom-controller.js',
        },
        '/assets/packages/lit/': {
          'lit-element/lit-element.js': '/assets/packages/lit-element/lit-element.js',
          '@lit/reactive-element/decorators/state.js': '/assets/packages/@lit/reactive-element/decorators/state.js',
        },
      }
    }
  });
  map.flatten();
  assert.deepStrictEqual(
    map.toJSON(),
    {
      imports: {
        '@patternfly/pfe-core': '/assets/packages/@patternfly/pfe-core/core.js',
        '@rhds/tokens': '/assets/packages/@rhds/tokens/js/tokens.js',
        '@lit/reactive-element': '/assets/packages/@lit/reactive-element/reactive-element.js',
        lit: '/assets/packages/lit/index.js',
        '@patternfly/elements/pf-tooltip/pf-tooltip.js': '/assets/packages/@patternfly/elements/pf-tooltip/pf-tooltip.js',
        '@patternfly/pfe-core/controllers/roving-tabindex-controller.js': '/assets/packages/@patternfly/pfe-core/controllers/roving-tabindex-controller.js'
      },
      scopes: {
        '/assets/packages/': {
          'lit/directives/class-map.js': '/assets/packages/lit/directives/class-map.js',
          '@floating-ui/dom': '/assets/packages/@floating-ui/dom/dist/floating-ui.dom.browser.min.mjs',
          '@patternfly/pfe-core/controllers/floating-dom-controller.js': '/assets/packages/@patternfly/pfe-core/controllers/floating-dom-controller.js',
          'lit-element/lit-element.js': '/assets/packages/lit-element/lit-element.js',
          '@lit/reactive-element/decorators/state.js': '/assets/packages/@lit/reactive-element/decorators/state.js',
        },
      }
    }
  );
}
