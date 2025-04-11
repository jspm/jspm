import { ImportMap } from '@jspm/import-map';
import { deepStrictEqual } from 'assert';

{
  const map = new ImportMap({
    mapUrl: new URL('.', import.meta.url),
    map: {
      scopes: {
        './packages/bio/bio-design-system/': {
          '@roundforest/react-feature-flags-context': './packages/commons/react-feature-flags-context/lib/src/react-feature-flags-context.js',
          '@emotion/react': 'https://ga.jspm.io/npm:@emotion/react@11.5.0/dist/dev.emotion-react.browser.cjs.js',
          react: 'https://ga.jspm.io/npm:react@17.0.2/dev.index.js',
          '@roundforest/emotion-styled': './packages/commons/emotion-styled/src/emotion-styled.js',
          '@roundforest/react-localization-commons': './packages/commons/react-localization-commons/lib/src/localization-commons.js',
          '@roundforest/react-ripple-effect': './packages/commons/react-ripple-effect/lib/src/ripple-effect.js',
          '@roundforest/react-full-screen-state': './packages/commons/react-full-screen-state/lib/src/react-full-screen-state.js',
          'react-toastify': 'https://ga.jspm.io/npm:react-toastify@8.0.3/dist/index.js',
          '@tippyjs/react/headless': 'https://ga.jspm.io/npm:@tippyjs/react@4.2.6/headless/dist/dev.tippy-react-headless.umd.js',
          'tippy.js/headless': 'https://ga.jspm.io/npm:tippy.js@6.3.3/headless/dist/dev.tippy-headless.cjs.js',
          '@roundforest/react-map-slots': './packages/commons/react-map-slots/src/map-slots.js',
          '@roundforest/react-tooltip': './packages/commons/react-tooltip/lib/src/tooltip.js',
          'react-dom': 'https://ga.jspm.io/npm:react-dom@17.0.2/dev.index.js',
          'react-copy-to-clipboard': 'https://ga.jspm.io/npm:react-copy-to-clipboard@5.0.4/lib/index.js'
        },
        './packages/bio/bio-home-page/': {
          '@roundforest/react-localization-commons': './packages/commons/react-localization-commons/lib/src/localization-commons.js',
          react: 'https://ga.jspm.io/npm:react@17.0.2/dev.index.js',
          '@roundforest/bio-design-system': './packages/bio/bio-design-system/lib/exports.js',
          '@roundforest/emotion-styled': './packages/commons/emotion-styled/src/emotion-styled.js',
          '@roundforest/bio-product-category-search': './packages/bio/bio-product-category-search/lib/src/exports.js',
          '@roundforest/react-environment-context': './packages/commons/react-environment-context/lib/src/react-environment-context.js',
          '@emotion/react': 'https://ga.jspm.io/npm:@emotion/react@11.5.0/dist/dev.emotion-react.browser.cjs.js',
          'react-helmet': 'https://ga.jspm.io/npm:react-helmet@6.1.0/lib/dev.Helmet.js',
          'react-dom': 'https://ga.jspm.io/npm:react-dom@17.0.2/dev.index.js',
          '@roundforest/bio-home-page': './packages/bio/bio-home-page/lib/src/bio-home-page.js'
        },
        './packages/bio/bio-product-category-search/': {
          '@roundforest/react-localization-commons': './packages/commons/react-localization-commons/lib/src/localization-commons.js',
          '@roundforest/react-environment-context': './packages/commons/react-environment-context/lib/src/react-environment-context.js',
          'react-query': 'https://ga.jspm.io/npm:react-query@3.31.0/lib/dev.index.js',
          react: 'https://ga.jspm.io/npm:react@17.0.2/dev.index.js',
          '@emotion/react': 'https://ga.jspm.io/npm:@emotion/react@11.5.0/dist/dev.emotion-react.browser.cjs.js',
          '@roundforest/emotion-styled': './packages/commons/emotion-styled/src/emotion-styled.js',
          '@roundforest/bio-design-system': './packages/bio/bio-design-system/lib/exports.js',
          '@roundforest/react-full-screen-state': './packages/commons/react-full-screen-state/lib/src/react-full-screen-state.js'
        },
        './packages/commons/emotion-styled/': {
          '@roundforest/frontend-commons': './packages/commons/frontend-commons/lib/src/frontend-commons.js',
          '@emotion/styled': 'https://ga.jspm.io/npm:@emotion/styled@11.3.0/dist/dev.emotion-styled.browser.cjs.js'
        },
        './packages/commons/react-environment-context/': { react: 'https://ga.jspm.io/npm:react@17.0.2/dev.index.js' },
        './packages/commons/react-feature-flags-context/': { react: 'https://ga.jspm.io/npm:react@17.0.2/dev.index.js' },
        './packages/commons/react-full-screen-state/': { react: 'https://ga.jspm.io/npm:react@17.0.2/dev.index.js' },
        './packages/commons/react-localization-commons/': { react: 'https://ga.jspm.io/npm:react@17.0.2/dev.index.js' },
        './packages/commons/react-map-slots/': {
          react: 'https://ga.jspm.io/npm:react@17.0.2/dev.index.js',
          'react-is': 'https://ga.jspm.io/npm:react-is@17.0.2/dev.index.js'
        },
        './packages/commons/react-portal/': {
          react: 'https://ga.jspm.io/npm:react@17.0.2/dev.index.js',
          'react-dom': 'https://ga.jspm.io/npm:react-dom@17.0.2/dev.index.js'
        },
        './packages/commons/react-ripple-effect/': {
          '@emotion/react': 'https://ga.jspm.io/npm:@emotion/react@11.5.0/dist/dev.emotion-react.browser.cjs.js',
          react: 'https://ga.jspm.io/npm:react@17.0.2/dev.index.js',
          '@roundforest/emotion-styled': './packages/commons/emotion-styled/src/emotion-styled.js'
        },
        './packages/commons/react-tooltip/': {
          react: 'https://ga.jspm.io/npm:react@17.0.2/dev.index.js',
          '@roundforest/emotion-styled': './packages/commons/emotion-styled/src/emotion-styled.js',
          '@roundforest/react-portal': './packages/commons/react-portal/lib/src/portal.js'
        },
        'https://ga.jspm.io/npm:react-dom@16.14.0/': { react: 'https://ga.jspm.io/npm:react@16.14.0/dev.index.js' },
        'https://ga.jspm.io/npm:react-dom@17.0.2/': {
          'scheduler/tracing': 'https://ga.jspm.io/npm:scheduler@0.20.2/dev.tracing.js',
          scheduler: 'https://ga.jspm.io/npm:scheduler@0.20.2/dev.index.js'
        },
        'https://ga.jspm.io/npm:react-query@3.31.0/': {
          'react-dom': 'https://ga.jspm.io/npm:react-dom@16.14.0/dev.index.js'
        },
        'https://ga.jspm.io/': {
          '@babel/runtime/helpers/extends': 'https://ga.jspm.io/npm:@babel/runtime@7.16.0/helpers/extends.js',
          '@babel/runtime/helpers/inheritsLoose': 'https://ga.jspm.io/npm:@babel/runtime@7.16.0/helpers/inheritsLoose.js',
          '@babel/runtime/helpers/interopRequireDefault': 'https://ga.jspm.io/npm:@babel/runtime@7.16.0/helpers/interopRequireDefault.js',
          '@emotion/cache': 'https://ga.jspm.io/npm:@emotion/cache@11.5.0/dist/dev.emotion-cache.browser.cjs.js',
          '@emotion/hash': 'https://ga.jspm.io/npm:@emotion/hash@0.8.0/dist/hash.browser.cjs.js',
          '@emotion/is-prop-valid': 'https://ga.jspm.io/npm:@emotion/is-prop-valid@1.1.0/dist/emotion-is-prop-valid.browser.cjs.js',
          '@emotion/memoize': 'https://ga.jspm.io/npm:@emotion/memoize@0.7.5/dist/emotion-memoize.browser.cjs.js',
          '@emotion/react': 'https://ga.jspm.io/npm:@emotion/react@11.5.0/dist/dev.emotion-react.browser.cjs.js',
          '@emotion/serialize': 'https://ga.jspm.io/npm:@emotion/serialize@1.0.2/dist/dev.emotion-serialize.browser.cjs.js',
          '@emotion/sheet': 'https://ga.jspm.io/npm:@emotion/sheet@1.0.3/dist/dev.emotion-sheet.browser.cjs.js',
          '@emotion/unitless': 'https://ga.jspm.io/npm:@emotion/unitless@0.7.5/dist/unitless.browser.cjs.js',
          '@emotion/utils': 'https://ga.jspm.io/npm:@emotion/utils@1.0.0/dist/emotion-utils.browser.cjs.js',
          '@emotion/weak-memoize': 'https://ga.jspm.io/npm:@emotion/weak-memoize@0.2.5/dist/weak-memoize.browser.cjs.js',
          '@popperjs/core': 'https://ga.jspm.io/npm:@popperjs/core@2.10.2/dist/cjs/dev.popper.js', clsx: 'https://ga.jspm.io/npm:clsx@1.1.1/dist/clsx.js',
          'copy-to-clipboard': 'https://ga.jspm.io/npm:copy-to-clipboard@3.3.1/index.js',
          'hoist-non-react-statics': 'https://ga.jspm.io/npm:hoist-non-react-statics@3.3.2/dist/hoist-non-react-statics.cjs.js',
          'object-assign': 'https://ga.jspm.io/npm:object-assign@4.1.1/index.js',
          'prop-types': 'https://ga.jspm.io/npm:prop-types@15.7.2/dev.index.js',
          'prop-types/checkPropTypes': 'https://ga.jspm.io/npm:prop-types@15.7.2/dev.checkPropTypes.js',
          react: 'https://ga.jspm.io/npm:react@17.0.2/dev.index.js',
          'react-dom': 'https://ga.jspm.io/npm:react-dom@17.0.2/dev.index.js',
          'react-fast-compare': 'https://ga.jspm.io/npm:react-fast-compare@3.2.0/index.js',
          'react-is': 'https://ga.jspm.io/npm:react-is@16.13.1/dev.index.js',
          'react-side-effect': 'https://ga.jspm.io/npm:react-side-effect@2.1.1/lib/index.js',
          scheduler: 'https://ga.jspm.io/npm:scheduler@0.19.1/dev.index.js',
          'scheduler/tracing': 'https://ga.jspm.io/npm:scheduler@0.19.1/dev.tracing.js',
          stylis: 'https://ga.jspm.io/npm:stylis@4.0.10/dist/umd/stylis.js',
          'tippy.js/headless': 'https://ga.jspm.io/npm:tippy.js@6.3.3/headless/dist/dev.tippy-headless.cjs.js',
          'toggle-selection': 'https://ga.jspm.io/npm:toggle-selection@1.0.6/index.js'
        }
      }
    }
  });
  map.flatten();
  deepStrictEqual(map.toJSON(), {
    scopes: {
      'https://ga.jspm.io/npm:react-dom@16.14.0/': { react: 'https://ga.jspm.io/npm:react@16.14.0/dev.index.js' },
      'https://ga.jspm.io/npm:react-dom@17.0.2/': {
        'scheduler/tracing': 'https://ga.jspm.io/npm:scheduler@0.20.2/dev.tracing.js',
        scheduler: 'https://ga.jspm.io/npm:scheduler@0.20.2/dev.index.js'
      },
      'https://ga.jspm.io/npm:react-query@3.31.0/': {
        'react-dom': 'https://ga.jspm.io/npm:react-dom@16.14.0/dev.index.js'
      },
      'https://ga.jspm.io/': {
        '@babel/runtime/helpers/extends': 'https://ga.jspm.io/npm:@babel/runtime@7.16.0/helpers/extends.js',
        '@babel/runtime/helpers/inheritsLoose': 'https://ga.jspm.io/npm:@babel/runtime@7.16.0/helpers/inheritsLoose.js',
        '@babel/runtime/helpers/interopRequireDefault': 'https://ga.jspm.io/npm:@babel/runtime@7.16.0/helpers/interopRequireDefault.js',
        '@emotion/cache': 'https://ga.jspm.io/npm:@emotion/cache@11.5.0/dist/dev.emotion-cache.browser.cjs.js',
        '@emotion/hash': 'https://ga.jspm.io/npm:@emotion/hash@0.8.0/dist/hash.browser.cjs.js',
        '@emotion/is-prop-valid': 'https://ga.jspm.io/npm:@emotion/is-prop-valid@1.1.0/dist/emotion-is-prop-valid.browser.cjs.js',
        '@emotion/memoize': 'https://ga.jspm.io/npm:@emotion/memoize@0.7.5/dist/emotion-memoize.browser.cjs.js',
        '@emotion/react': 'https://ga.jspm.io/npm:@emotion/react@11.5.0/dist/dev.emotion-react.browser.cjs.js',
        '@emotion/serialize': 'https://ga.jspm.io/npm:@emotion/serialize@1.0.2/dist/dev.emotion-serialize.browser.cjs.js',
        '@emotion/sheet': 'https://ga.jspm.io/npm:@emotion/sheet@1.0.3/dist/dev.emotion-sheet.browser.cjs.js', '@emotion/unitless': 'https://ga.jspm.io/npm:@emotion/unitless@0.7.5/dist/unitless.browser.cjs.js',
        '@emotion/utils': 'https://ga.jspm.io/npm:@emotion/utils@1.0.0/dist/emotion-utils.browser.cjs.js',
        '@emotion/weak-memoize': 'https://ga.jspm.io/npm:@emotion/weak-memoize@0.2.5/dist/weak-memoize.browser.cjs.js',
        '@popperjs/core': 'https://ga.jspm.io/npm:@popperjs/core@2.10.2/dist/cjs/dev.popper.js',
        clsx: 'https://ga.jspm.io/npm:clsx@1.1.1/dist/clsx.js',
        'copy-to-clipboard': 'https://ga.jspm.io/npm:copy-to-clipboard@3.3.1/index.js',
        'hoist-non-react-statics': 'https://ga.jspm.io/npm:hoist-non-react-statics@3.3.2/dist/hoist-non-react-statics.cjs.js',
        'object-assign': 'https://ga.jspm.io/npm:object-assign@4.1.1/index.js',
        'prop-types': 'https://ga.jspm.io/npm:prop-types@15.7.2/dev.index.js',
        'prop-types/checkPropTypes': 'https://ga.jspm.io/npm:prop-types@15.7.2/dev.checkPropTypes.js',
        react: 'https://ga.jspm.io/npm:react@17.0.2/dev.index.js',
        'react-dom': 'https://ga.jspm.io/npm:react-dom@17.0.2/dev.index.js',
        'react-fast-compare': 'https://ga.jspm.io/npm:react-fast-compare@3.2.0/index.js',
        'react-is': 'https://ga.jspm.io/npm:react-is@16.13.1/dev.index.js',
        'react-side-effect': 'https://ga.jspm.io/npm:react-side-effect@2.1.1/lib/index.js',
        scheduler: 'https://ga.jspm.io/npm:scheduler@0.19.1/dev.index.js',
        'scheduler/tracing': 'https://ga.jspm.io/npm:scheduler@0.19.1/dev.tracing.js',
        stylis: 'https://ga.jspm.io/npm:stylis@4.0.10/dist/umd/stylis.js',
        'tippy.js/headless': 'https://ga.jspm.io/npm:tippy.js@6.3.3/headless/dist/dev.tippy-headless.cjs.js',
        'toggle-selection': 'https://ga.jspm.io/npm:toggle-selection@1.0.6/index.js'
      },
      './packages/': {
        '@emotion/react': 'https://ga.jspm.io/npm:@emotion/react@11.5.0/dist/dev.emotion-react.browser.cjs.js',
        '@emotion/styled': 'https://ga.jspm.io/npm:@emotion/styled@11.3.0/dist/dev.emotion-styled.browser.cjs.js',
        '@roundforest/bio-design-system': './packages/bio/bio-design-system/lib/exports.js',
        '@roundforest/bio-home-page': './packages/bio/bio-home-page/lib/src/bio-home-page.js',
        '@roundforest/bio-product-category-search': './packages/bio/bio-product-category-search/lib/src/exports.js',
        '@roundforest/emotion-styled': './packages/commons/emotion-styled/src/emotion-styled.js',
        '@roundforest/frontend-commons': './packages/commons/frontend-commons/lib/src/frontend-commons.js',
        '@roundforest/react-environment-context': './packages/commons/react-environment-context/lib/src/react-environment-context.js',
        '@roundforest/react-feature-flags-context': './packages/commons/react-feature-flags-context/lib/src/react-feature-flags-context.js',
        '@roundforest/react-full-screen-state': './packages/commons/react-full-screen-state/lib/src/react-full-screen-state.js',
        '@roundforest/react-localization-commons': './packages/commons/react-localization-commons/lib/src/localization-commons.js',
        '@roundforest/react-map-slots': './packages/commons/react-map-slots/src/map-slots.js',
        '@roundforest/react-portal': './packages/commons/react-portal/lib/src/portal.js',
        '@roundforest/react-ripple-effect': './packages/commons/react-ripple-effect/lib/src/ripple-effect.js',
        '@roundforest/react-tooltip': './packages/commons/react-tooltip/lib/src/tooltip.js',
        '@tippyjs/react/headless': 'https://ga.jspm.io/npm:@tippyjs/react@4.2.6/headless/dist/dev.tippy-react-headless.umd.js',
        react: 'https://ga.jspm.io/npm:react@17.0.2/dev.index.js',
        'react-copy-to-clipboard': 'https://ga.jspm.io/npm:react-copy-to-clipboard@5.0.4/lib/index.js',
        'react-dom': 'https://ga.jspm.io/npm:react-dom@17.0.2/dev.index.js',
        'react-helmet': 'https://ga.jspm.io/npm:react-helmet@6.1.0/lib/dev.Helmet.js',
        'react-is': 'https://ga.jspm.io/npm:react-is@17.0.2/dev.index.js',
        'react-query': 'https://ga.jspm.io/npm:react-query@3.31.0/lib/dev.index.js',
        'react-toastify': 'https://ga.jspm.io/npm:react-toastify@8.0.3/dist/index.js',
        'tippy.js/headless': 'https://ga.jspm.io/npm:tippy.js@6.3.3/headless/dist/dev.tippy-headless.cjs.js'
      }
    }
  });
}

{
  const map = new ImportMap({
    mapUrl: new URL('.', import.meta.url),
    map: {
      imports: { '@jspm/generator': '../../dist/generator.js' },
      scopes: {
        '../../': {
          url: 'https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.12/nodelibs/browser/url.js',
          fs: 'https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.12/nodelibs/browser/fs.js',
          '@babel/preset-typescript': 'https://ga.jspm.io/npm:@babel/preset-typescript@7.16.0/lib/index.js',
          '@babel/core': 'https://ga.jspm.io/npm:@babel/core@7.16.0/lib/dev.index.js',
          '#fetch': '../../dist/fetch-native.js',
          'es-module-lexer': 'https://ga.jspm.io/npm:es-module-lexer@0.9.3/dist/lexer.js',
          sver: 'https://ga.jspm.io/npm:sver@1.8.3/sver.js',
          '@jspm/import-map': 'https://ga.jspm.io/npm:@jspm/import-map@0.1.5/dist/map.js',
          'sver/convert-range.js': 'https://ga.jspm.io/npm:sver@1.8.3/convert-range.js'
        },
        'https://ga.jspm.io/npm:@babel/code-frame@7.16.0/': {
          process: 'https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.12/nodelibs/browser/process.js',
          '@babel/highlight': 'https://ga.jspm.io/npm:@babel/highlight@7.16.0/lib/index.js'
        },
        'https://ga.jspm.io/npm:@babel/core@7.16.0/': {
          '@babel/helper-compilation-targets': 'https://ga.jspm.io/npm:@babel/helper-compilation-targets@7.16.0/lib/index.js',
          semver: 'https://ga.jspm.io/npm:semver@6.3.0/semver.js',
          '@babel/helpers': 'https://ga.jspm.io/npm:@babel/helpers@7.16.0/lib/index.js',
          '@babel/helper-module-transforms': 'https://ga.jspm.io/npm:@babel/helper-module-transforms@7.16.0/lib/index.js',
          '@babel/generator': 'https://ga.jspm.io/npm:@babel/generator@7.16.0/lib/index.js',
          '@babel/template': 'https://ga.jspm.io/npm:@babel/template@7.16.0/lib/index.js',
          '@babel/code-frame': 'https://ga.jspm.io/npm:@babel/code-frame@7.16.0/lib/index.js',
          '@babel/types': 'https://ga.jspm.io/npm:@babel/types@7.16.0/lib/index.js',
          '@babel/traverse': 'https://ga.jspm.io/npm:@babel/traverse@7.16.0/lib/index.js',
          gensync: 'https://ga.jspm.io/npm:gensync@1.0.0-beta.2/index.js',
          '#lib/config/files/index.js': 'https://ga.jspm.io/npm:@babel/core@7.16.0/lib/config/files/index-browser.js',
          '#lib/config/resolve-targets.js': 'https://ga.jspm.io/npm:@babel/core@7.16.0/lib/config/resolve-targets-browser.js',
          '#lib/transformation/util/clone-deep.js': 'https://ga.jspm.io/npm:@babel/core@7.16.0/lib/transformation/util/clone-deep-browser.js',
          '#lib/transform-file.js': 'https://ga.jspm.io/npm:@babel/core@7.16.0/lib/transform-file-browser.js',
          process: 'https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.12/nodelibs/browser/process.js',
          path: 'https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.12/nodelibs/browser/path.js',
          fs: 'https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.12/nodelibs/browser/fs.js',
          debug: 'https://ga.jspm.io/npm:debug@4.3.2/src/browser.js',
          'convert-source-map': 'https://ga.jspm.io/npm:convert-source-map@1.8.0/index.js',
          'source-map': 'https://ga.jspm.io/npm:source-map@0.5.7/source-map.js',
          '@babel/parser': 'https://ga.jspm.io/npm:@babel/parser@7.16.2/lib/index.js'
        },
        'https://ga.jspm.io/npm:@babel/generator@7.16.0/': {
          '@babel/types': 'https://ga.jspm.io/npm:@babel/types@7.16.0/lib/index.js',
          jsesc: 'https://ga.jspm.io/npm:jsesc@2.5.2/jsesc.js',
          'source-map': 'https://ga.jspm.io/npm:source-map@0.5.7/source-map.js'
        },
        'https://ga.jspm.io/npm:@babel/helper-annotate-as-pure@7.16.0/': {
          '@babel/types': 'https://ga.jspm.io/npm:@babel/types@7.16.0/lib/index.js'
        },
        'https://ga.jspm.io/npm:@babel/helper-compilation-targets@7.16.0/': {
          '@babel/helper-validator-option': 'https://ga.jspm.io/npm:@babel/helper-validator-option@7.14.5/lib/index.js',
          process: 'https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.12/nodelibs/browser/process.js',
          semver: 'https://ga.jspm.io/npm:semver@6.3.0/semver.js',
          '@babel/compat-data/native-modules': 'https://ga.jspm.io/npm:@babel/compat-data@7.16.0/native-modules.js',
          '@babel/compat-data/plugins': 'https://ga.jspm.io/npm:@babel/compat-data@7.16.0/plugins.js',
          browserslist: 'https://ga.jspm.io/npm:browserslist@4.17.4/index.js'
        },
        'https://ga.jspm.io/npm:@babel/helper-create-class-features-plugin@7.16.0/': {
          '@babel/helper-function-name': 'https://ga.jspm.io/npm:@babel/helper-function-name@7.16.0/lib/index.js', '@babel/helper-split-export-declaration': 'https://ga.jspm.io/npm:@babel/helper-split-export-declaration@7.16.0/lib/index.js',
          '@babel/core': 'https://ga.jspm.io/npm:@babel/core@7.16.0/lib/dev.index.js',
          '@babel/helper-replace-supers': 'https://ga.jspm.io/npm:@babel/helper-replace-supers@7.16.0/lib/index.js',
          '@babel/helper-member-expression-to-functions': 'https://ga.jspm.io/npm:@babel/helper-member-expression-to-functions@7.16.0/lib/index.js',
          '@babel/helper-optimise-call-expression': 'https://ga.jspm.io/npm:@babel/helper-optimise-call-expression@7.16.0/lib/index.js',
          '@babel/helper-annotate-as-pure': 'https://ga.jspm.io/npm:@babel/helper-annotate-as-pure@7.16.0/lib/index.js'
        },
        'https://ga.jspm.io/npm:@babel/helper-function-name@7.16.0/': {
          '@babel/types': 'https://ga.jspm.io/npm:@babel/types@7.16.0/lib/index.js',
          '@babel/template': 'https://ga.jspm.io/npm:@babel/template@7.16.0/lib/index.js',
          '@babel/helper-get-function-arity': 'https://ga.jspm.io/npm:@babel/helper-get-function-arity@7.16.0/lib/index.js'
        },
        'https://ga.jspm.io/npm:@babel/helper-get-function-arity@7.16.0/': {
          '@babel/types': 'https://ga.jspm.io/npm:@babel/types@7.16.0/lib/index.js'
        },
        'https://ga.jspm.io/npm:@babel/helper-hoist-variables@7.16.0/': {
          '@babel/types': 'https://ga.jspm.io/npm:@babel/types@7.16.0/lib/index.js'
        },
        'https://ga.jspm.io/npm:@babel/helper-member-expression-to-functions@7.16.0/': {
          '@babel/types': 'https://ga.jspm.io/npm:@babel/types@7.16.0/lib/index.js'
        },
        'https://ga.jspm.io/npm:@babel/helper-module-imports@7.16.0/': {
          assert: 'https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.12/nodelibs/browser/assert.js',
          '@babel/types': 'https://ga.jspm.io/npm:@babel/types@7.16.0/lib/index.js'
        },
        'https://ga.jspm.io/npm:@babel/helper-module-transforms@7.16.0/': {
          path: 'https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.12/nodelibs/browser/path.js',
          '@babel/helper-validator-identifier': 'https://ga.jspm.io/npm:@babel/helper-validator-identifier@7.15.7/lib/index.js',
          '@babel/helper-split-export-declaration': 'https://ga.jspm.io/npm:@babel/helper-split-export-declaration@7.16.0/lib/index.js',
          assert: 'https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.12/nodelibs/browser/assert.js',
          '@babel/types': 'https://ga.jspm.io/npm:@babel/types@7.16.0/lib/index.js',
          '@babel/template': 'https://ga.jspm.io/npm:@babel/template@7.16.0/lib/index.js',
          '@babel/traverse': 'https://ga.jspm.io/npm:@babel/traverse@7.16.0/lib/index.js',
          '@babel/helper-simple-access': 'https://ga.jspm.io/npm:@babel/helper-simple-access@7.16.0/lib/index.js', '@babel/helper-module-imports': 'https://ga.jspm.io/npm:@babel/helper-module-imports@7.16.0/lib/index.js',
          '@babel/helper-replace-supers': 'https://ga.jspm.io/npm:@babel/helper-replace-supers@7.16.0/lib/index.js'
        },
        'https://ga.jspm.io/npm:@babel/helper-optimise-call-expression@7.16.0/': {
          '@babel/types': 'https://ga.jspm.io/npm:@babel/types@7.16.0/lib/index.js'
        },
        'https://ga.jspm.io/npm:@babel/helper-replace-supers@7.16.0/': {
          '@babel/traverse': 'https://ga.jspm.io/npm:@babel/traverse@7.16.0/lib/index.js',
          '@babel/types': 'https://ga.jspm.io/npm:@babel/types@7.16.0/lib/index.js',
          '@babel/helper-optimise-call-expression': 'https://ga.jspm.io/npm:@babel/helper-optimise-call-expression@7.16.0/lib/index.js',
          '@babel/helper-member-expression-to-functions': 'https://ga.jspm.io/npm:@babel/helper-member-expression-to-functions@7.16.0/lib/index.js'
        },
        'https://ga.jspm.io/npm:@babel/helper-simple-access@7.16.0/': {
          '@babel/types': 'https://ga.jspm.io/npm:@babel/types@7.16.0/lib/index.js'
        },
        'https://ga.jspm.io/npm:@babel/helper-split-export-declaration@7.16.0/': {
          '@babel/types': 'https://ga.jspm.io/npm:@babel/types@7.16.0/lib/index.js'
        },
        'https://ga.jspm.io/npm:@babel/helpers@7.16.0/': {
          '@babel/template': 'https://ga.jspm.io/npm:@babel/template@7.16.0/lib/index.js',
          '@babel/traverse': 'https://ga.jspm.io/npm:@babel/traverse@7.16.0/lib/index.js',
          '@babel/types': 'https://ga.jspm.io/npm:@babel/types@7.16.0/lib/index.js'
        },
        'https://ga.jspm.io/npm:@babel/highlight@7.16.0/': {
          '@babel/helper-validator-identifier': 'https://ga.jspm.io/npm:@babel/helper-validator-identifier@7.15.7/lib/index.js',
          'js-tokens': 'https://ga.jspm.io/npm:js-tokens@4.0.0/index.js',
          chalk: 'https://ga.jspm.io/npm:chalk@2.4.2/index.js'
        },
        'https://ga.jspm.io/npm:@babel/plugin-syntax-typescript@7.16.0/': {
          '@babel/helper-plugin-utils': 'https://ga.jspm.io/npm:@babel/helper-plugin-utils@7.14.5/lib/index.js'
        },
        'https://ga.jspm.io/npm:@babel/plugin-transform-typescript@7.16.0/': {
          '@babel/helper-plugin-utils': 'https://ga.jspm.io/npm:@babel/helper-plugin-utils@7.14.5/lib/index.js',
          assert: 'https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.12/nodelibs/browser/assert.js',
          '@babel/core': 'https://ga.jspm.io/npm:@babel/core@7.16.0/lib/dev.index.js',
          '@babel/plugin-syntax-typescript': 'https://ga.jspm.io/npm:@babel/plugin-syntax-typescript@7.16.0/lib/index.js',
          '@babel/helper-create-class-features-plugin': 'https://ga.jspm.io/npm:@babel/helper-create-class-features-plugin@7.16.0/lib/index.js'
        },
        'https://ga.jspm.io/npm:@babel/preset-typescript@7.16.0/': {
          '@babel/helper-plugin-utils': 'https://ga.jspm.io/npm:@babel/helper-plugin-utils@7.14.5/lib/index.js',
          '@babel/helper-validator-option': 'https://ga.jspm.io/npm:@babel/helper-validator-option@7.14.5/lib/index.js',
          '@babel/plugin-transform-typescript': 'https://ga.jspm.io/npm:@babel/plugin-transform-typescript@7.16.0/lib/index.js'
        },
        'https://ga.jspm.io/npm:@babel/template@7.16.0/': {
          '@babel/types': 'https://ga.jspm.io/npm:@babel/types@7.16.0/lib/index.js',
          '@babel/parser': 'https://ga.jspm.io/npm:@babel/parser@7.16.2/lib/index.js',
          '@babel/code-frame': 'https://ga.jspm.io/npm:@babel/code-frame@7.16.0/lib/index.js'
        },
        'https://ga.jspm.io/npm:@babel/traverse@7.16.0/': {
          '@babel/types': 'https://ga.jspm.io/npm:@babel/types@7.16.0/lib/index.js',
          debug: 'https://ga.jspm.io/npm:debug@4.3.2/src/browser.js',
          '@babel/code-frame': 'https://ga.jspm.io/npm:@babel/code-frame@7.16.0/lib/index.js',
          '@babel/generator': 'https://ga.jspm.io/npm:@babel/generator@7.16.0/lib/index.js',
          '@babel/parser': 'https://ga.jspm.io/npm:@babel/parser@7.16.2/lib/index.js',
          '@babel/helper-split-export-declaration': 'https://ga.jspm.io/npm:@babel/helper-split-export-declaration@7.16.0/lib/index.js',
          globals: 'https://ga.jspm.io/npm:globals@11.12.0/index.js',
          '@babel/helper-hoist-variables': 'https://ga.jspm.io/npm:@babel/helper-hoist-variables@7.16.0/lib/index.js',
          '@babel/helper-function-name': 'https://ga.jspm.io/npm:@babel/helper-function-name@7.16.0/lib/index.js'
        },
        'https://ga.jspm.io/npm:@babel/types@7.16.0/': {
          process: 'https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.12/nodelibs/browser/process.js',
          '@babel/helper-validator-identifier': 'https://ga.jspm.io/npm:@babel/helper-validator-identifier@7.15.7/lib/index.js',
          'to-fast-properties': 'https://ga.jspm.io/npm:to-fast-properties@2.0.0/index.js'
        },
        'https://ga.jspm.io/npm:ansi-styles@3.2.1/': {
          'color-convert': 'https://ga.jspm.io/npm:color-convert@1.9.3/index.js'
        },
        'https://ga.jspm.io/npm:browserslist@4.17.4/': {
          path: 'https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.12/nodelibs/browser/path.js',
          process: 'https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.12/nodelibs/browser/process.js',
          '#node.js': 'https://ga.jspm.io/npm:browserslist@4.17.4/browser.js',
          'node-releases/data/processed/envs.json': 'https://ga.jspm.io/npm:node-releases@2.0.1/data/processed/envs.json.js',
          'node-releases/data/release-schedule/release-schedule.json': 'https://ga.jspm.io/npm:node-releases@2.0.1/data/release-schedule/release-schedule.json.js',
          'electron-to-chromium/versions': 'https://ga.jspm.io/npm:electron-to-chromium@1.3.886/versions.js',
          'caniuse-lite/dist/unpacker/agents': 'https://ga.jspm.io/npm:caniuse-lite@1.0.30001274/dist/unpacker/agents.js'
        },
        'https://ga.jspm.io/npm:chalk@2.4.2/': {
          process: 'https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.12/nodelibs/browser/process.js',
          'escape-string-regexp': 'https://ga.jspm.io/npm:escape-string-regexp@1.0.5/index.js',
          'supports-color': 'https://ga.jspm.io/npm:supports-color@5.5.0/browser.js',
          'ansi-styles': 'https://ga.jspm.io/npm:ansi-styles@3.2.1/index.js'
        },
        'https://ga.jspm.io/npm:color-convert@1.9.3/': {
          'color-name': 'https://ga.jspm.io/npm:color-name@1.1.3/index.js'
        },
        'https://ga.jspm.io/npm:convert-source-map@1.8.0/': {
          fs: 'https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.12/nodelibs/browser/fs.js',
          path: 'https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.12/nodelibs/browser/path.js',
          'safe-buffer': 'https://ga.jspm.io/npm:safe-buffer@5.1.2/index.js'
        },
        'https://ga.jspm.io/npm:debug@4.3.2/': {
          process: 'https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.12/nodelibs/browser/process.js',
          ms: 'https://ga.jspm.io/npm:ms@2.1.2/index.js'
        },
        'https://ga.jspm.io/npm:jsesc@2.5.2/': {
          buffer: 'https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.12/nodelibs/browser/buffer.js'
        },
        'https://ga.jspm.io/npm:safe-buffer@5.1.2/': {
          buffer: 'https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.12/nodelibs/browser/buffer.js'
        },
        'https://ga.jspm.io/npm:semver@6.3.0/': {
          process: 'https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.12/nodelibs/browser/process.js'
        },
        'https://ga.jspm.io/npm:sver@1.8.3/': { semver: 'https://ga.jspm.io/npm:semver@6.3.0/semver.js' }
      }
    }
  });
  map.flatten();
  deepStrictEqual(map.toJSON(), {
    imports: { '@jspm/generator': '../../dist/generator.js' },
    scopes: {
      '../../': {
        '#fetch': '../../dist/fetch-native.js',
        '@babel/core': 'https://ga.jspm.io/npm:@babel/core@7.16.0/lib/dev.index.js',
        '@babel/preset-typescript': 'https://ga.jspm.io/npm:@babel/preset-typescript@7.16.0/lib/index.js',
        '@jspm/import-map': 'https://ga.jspm.io/npm:@jspm/import-map@0.1.5/dist/map.js',
        'es-module-lexer': 'https://ga.jspm.io/npm:es-module-lexer@0.9.3/dist/lexer.js',
        fs: 'https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.12/nodelibs/browser/fs.js',
        sver: 'https://ga.jspm.io/npm:sver@1.8.3/sver.js',
        'sver/convert-range.js': 'https://ga.jspm.io/npm:sver@1.8.3/convert-range.js',
        url: 'https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.12/nodelibs/browser/url.js'
      },
      'https://ga.jspm.io/': {
        '#lib/config/files/index.js': 'https://ga.jspm.io/npm:@babel/core@7.16.0/lib/config/files/index-browser.js',
        '#lib/config/resolve-targets.js': 'https://ga.jspm.io/npm:@babel/core@7.16.0/lib/config/resolve-targets-browser.js',
        '#lib/transform-file.js': 'https://ga.jspm.io/npm:@babel/core@7.16.0/lib/transform-file-browser.js',
        '#lib/transformation/util/clone-deep.js': 'https://ga.jspm.io/npm:@babel/core@7.16.0/lib/transformation/util/clone-deep-browser.js',
        '#node.js': 'https://ga.jspm.io/npm:browserslist@4.17.4/browser.js',
        '@babel/code-frame': 'https://ga.jspm.io/npm:@babel/code-frame@7.16.0/lib/index.js',
        '@babel/compat-data/native-modules': 'https://ga.jspm.io/npm:@babel/compat-data@7.16.0/native-modules.js',
        '@babel/compat-data/plugins': 'https://ga.jspm.io/npm:@babel/compat-data@7.16.0/plugins.js',
        '@babel/core': 'https://ga.jspm.io/npm:@babel/core@7.16.0/lib/dev.index.js',
        '@babel/generator': 'https://ga.jspm.io/npm:@babel/generator@7.16.0/lib/index.js',
        '@babel/helper-annotate-as-pure': 'https://ga.jspm.io/npm:@babel/helper-annotate-as-pure@7.16.0/lib/index.js',
        '@babel/helper-compilation-targets': 'https://ga.jspm.io/npm:@babel/helper-compilation-targets@7.16.0/lib/index.js',
        '@babel/helper-create-class-features-plugin': 'https://ga.jspm.io/npm:@babel/helper-create-class-features-plugin@7.16.0/lib/index.js',
        '@babel/helper-function-name': 'https://ga.jspm.io/npm:@babel/helper-function-name@7.16.0/lib/index.js', '@babel/helper-get-function-arity': 'https://ga.jspm.io/npm:@babel/helper-get-function-arity@7.16.0/lib/index.js',
        '@babel/helper-hoist-variables': 'https://ga.jspm.io/npm:@babel/helper-hoist-variables@7.16.0/lib/index.js',
        '@babel/helper-member-expression-to-functions': 'https://ga.jspm.io/npm:@babel/helper-member-expression-to-functions@7.16.0/lib/index.js',
        '@babel/helper-module-imports': 'https://ga.jspm.io/npm:@babel/helper-module-imports@7.16.0/lib/index.js',
        '@babel/helper-module-transforms': 'https://ga.jspm.io/npm:@babel/helper-module-transforms@7.16.0/lib/index.js',
        '@babel/helper-optimise-call-expression': 'https://ga.jspm.io/npm:@babel/helper-optimise-call-expression@7.16.0/lib/index.js',
        '@babel/helper-plugin-utils': 'https://ga.jspm.io/npm:@babel/helper-plugin-utils@7.14.5/lib/index.js',
        '@babel/helper-replace-supers': 'https://ga.jspm.io/npm:@babel/helper-replace-supers@7.16.0/lib/index.js',
        '@babel/helper-simple-access': 'https://ga.jspm.io/npm:@babel/helper-simple-access@7.16.0/lib/index.js',
        '@babel/helper-split-export-declaration': 'https://ga.jspm.io/npm:@babel/helper-split-export-declaration@7.16.0/lib/index.js',
        '@babel/helper-validator-identifier': 'https://ga.jspm.io/npm:@babel/helper-validator-identifier@7.15.7/lib/index.js',
        '@babel/helper-validator-option': 'https://ga.jspm.io/npm:@babel/helper-validator-option@7.14.5/lib/index.js',
        '@babel/helpers': 'https://ga.jspm.io/npm:@babel/helpers@7.16.0/lib/index.js',
        '@babel/highlight': 'https://ga.jspm.io/npm:@babel/highlight@7.16.0/lib/index.js',
        '@babel/parser': 'https://ga.jspm.io/npm:@babel/parser@7.16.2/lib/index.js',
        '@babel/plugin-syntax-typescript': 'https://ga.jspm.io/npm:@babel/plugin-syntax-typescript@7.16.0/lib/index.js',
        '@babel/plugin-transform-typescript': 'https://ga.jspm.io/npm:@babel/plugin-transform-typescript@7.16.0/lib/index.js',
        '@babel/template': 'https://ga.jspm.io/npm:@babel/template@7.16.0/lib/index.js',
        '@babel/traverse': 'https://ga.jspm.io/npm:@babel/traverse@7.16.0/lib/index.js',
        '@babel/types': 'https://ga.jspm.io/npm:@babel/types@7.16.0/lib/index.js',
        'ansi-styles': 'https://ga.jspm.io/npm:ansi-styles@3.2.1/index.js',
        assert: 'https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.12/nodelibs/browser/assert.js',
        browserslist: 'https://ga.jspm.io/npm:browserslist@4.17.4/index.js',
        buffer: 'https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.12/nodelibs/browser/buffer.js',
        'caniuse-lite/dist/unpacker/agents': 'https://ga.jspm.io/npm:caniuse-lite@1.0.30001274/dist/unpacker/agents.js',
        chalk: 'https://ga.jspm.io/npm:chalk@2.4.2/index.js',
        'color-convert': 'https://ga.jspm.io/npm:color-convert@1.9.3/index.js',
        'color-name': 'https://ga.jspm.io/npm:color-name@1.1.3/index.js',
        'convert-source-map': 'https://ga.jspm.io/npm:convert-source-map@1.8.0/index.js',
        debug: 'https://ga.jspm.io/npm:debug@4.3.2/src/browser.js',
        'electron-to-chromium/versions': 'https://ga.jspm.io/npm:electron-to-chromium@1.3.886/versions.js',
        'escape-string-regexp': 'https://ga.jspm.io/npm:escape-string-regexp@1.0.5/index.js',
        fs: 'https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.12/nodelibs/browser/fs.js',
        gensync: 'https://ga.jspm.io/npm:gensync@1.0.0-beta.2/index.js',
        globals: 'https://ga.jspm.io/npm:globals@11.12.0/index.js',
        'js-tokens': 'https://ga.jspm.io/npm:js-tokens@4.0.0/index.js',
        jsesc: 'https://ga.jspm.io/npm:jsesc@2.5.2/jsesc.js',
        ms: 'https://ga.jspm.io/npm:ms@2.1.2/index.js',
        'node-releases/data/processed/envs.json': 'https://ga.jspm.io/npm:node-releases@2.0.1/data/processed/envs.json.js',
        'node-releases/data/release-schedule/release-schedule.json': 'https://ga.jspm.io/npm:node-releases@2.0.1/data/release-schedule/release-schedule.json.js',
        path: 'https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.12/nodelibs/browser/path.js',
        process: 'https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.12/nodelibs/browser/process.js',
        'safe-buffer': 'https://ga.jspm.io/npm:safe-buffer@5.1.2/index.js',
        semver: 'https://ga.jspm.io/npm:semver@6.3.0/semver.js',
        'source-map': 'https://ga.jspm.io/npm:source-map@0.5.7/source-map.js',
        'supports-color': 'https://ga.jspm.io/npm:supports-color@5.5.0/browser.js',
        'to-fast-properties': 'https://ga.jspm.io/npm:to-fast-properties@2.0.0/index.js'
      }
    }
  });
}
