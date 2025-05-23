import { Generator } from '@jspm/generator';
import assert from 'assert';
import { SemverRange } from 'sver';

const generator = new Generator({
  rootUrl: new URL('./local', import.meta.url),
  env: ['production', 'browser'],
  resolutions: {
    react: '17'
  }
});

const esmsPkg = await generator.traceMap.resolver.pm.resolveLatestTarget(
  { name: 'es-module-shims', registry: 'npm', ranges: [new SemverRange('*')] },
  generator.traceMap.installer.defaultProvider,
  undefined,
  generator.traceMap.resolver
);
const esmsUrl =
  (await generator.traceMap.resolver.pm.pkgToUrl(
    esmsPkg,
    generator.traceMap.installer.defaultProvider.provider,
    generator.traceMap.installer.defaultProvider.layer
  )) + 'dist/es-module-shims.js';

const html = `
<!doctype html>
<script type="importmap">
{
  "imports": {
    "object-assign": "/react.js"
  }
}
</script>
<script type="module">
  import 'react';
</script>
`;

const pins = await generator.addMappings(html);
assert.strictEqual(
  await generator.htmlInject(html, { pins, preload: true }),
  '\n' +
    '<!doctype html>\n' +
    '<!-- Generated by @jspm/generator - https://github.com/jspm/generator -->\n' +
    `<script async src="${esmsUrl}" crossorigin="anonymous"></script>\n` +
    '<script type="importmap">\n' +
    '{\n' +
    '  "imports": {\n' +
    '    "object-assign": "/react.js",\n' +
    '    "react": "https://ga.jspm.io/npm:react@17.0.2/index.js"\n' +
    '  }\n' +
    '}\n' +
    '</script>\n' +
    '<link rel="modulepreload" href="/react.js" />\n' +
    '<link rel="modulepreload" href="https://ga.jspm.io/npm:react@17.0.2/cjs/react.production.min.js" />\n' +
    '<link rel="modulepreload" href="https://ga.jspm.io/npm:react@17.0.2/index.js" />\n' +
    '<script type="module">\n' +
    "  import 'react';\n" +
    '</script>\n'
);

{
  const generator = new Generator({
    rootUrl: new URL('./local', import.meta.url),
    env: ['production', 'browser']
  });

  // Idempotency
  const html =
    '\n' +
    '<!doctype html>\n' +
    `<script async src="${esmsUrl}" crossorigin="anonymous"></script>\n` +
    '<script type="importmap">\n' +
    '{\n' +
    '  "imports": {\n' +
    '    "react": "https://ga.jspm.io/npm:react@17.0.2/index.js"\n' +
    '  },\n' +
    '  "scopes": {\n' +
    '    "https://ga.jspm.io/npm:react@17.0.2/": {\n' +
    '      "object-assign": "https://ga.jspm.io/npm:object-assign@4.1.1/index.js"\n' +
    '    }\n' +
    '  }\n' +
    '}\n' +
    '</script>\n' +
    '<link rel="modulepreload" href="https://ga.jspm.io/npm:react@17.0.1/index.js" />\n' +
    '<link rel="modulepreload" href="/react.js" />\n' +
    '<script type="module">\n' +
    "  import 'react';\n" +
    '</script>\n';

  const pins = await generator.addMappings(html);
  assert.strictEqual(
    await generator.htmlInject(html, {
      pins,
      preload: true,
      whitespace: false
    }),
    '\n' +
      '<!doctype html>\n' +
      '<!-- Generated by @jspm/generator - https://github.com/jspm/generator -->\n' +
      `<script async src="${esmsUrl}" crossorigin="anonymous"></script>\n` +
      '<script type="importmap">{"imports":{"react":"https://ga.jspm.io/npm:react@17.0.2/index.js"},"scopes":{"https://ga.jspm.io/":{"object-assign":"https://ga.jspm.io/npm:object-assign@4.1.1/index.js"}}}</script>\n' +
      '<link rel="modulepreload" href="https://ga.jspm.io/npm:object-assign@4.1.1/index.js" /><link rel="modulepreload" href="https://ga.jspm.io/npm:react@17.0.2/cjs/react.production.min.js" /><link rel="modulepreload" href="https://ga.jspm.io/npm:react@17.0.2/index.js" />\n' +
      '<script type="module">\n' +
      "  import 'react';\n" +
      '</script>\n'
  );
}
