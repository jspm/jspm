import { Generator } from '@jspm/generator';
import assert from 'assert';
import { SemverRange } from 'sver';

let generator = new Generator({
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

let html = `
  <!doctype html>
  <script type="module">import 'react'</script>
`;

let pins = await generator.addMappings(html);

assert.strictEqual(
  await generator.htmlInject(html, { pins, whitespace: true }),
  '\n' +
    '  <!doctype html>\n' +
    '  <!-- Generated by @jspm/generator - https://github.com/jspm/generator -->\n' +
    `  <script async src="${esmsUrl}" crossorigin="anonymous"></script>\n` +
    '  <script type="importmap">\n' +
    '  {\n' +
    '    "imports": {\n' +
    '      "react": "https://ga.jspm.io/npm:react@17.0.2/index.js"\n' +
    '    },\n' +
    '    "scopes": {\n' +
    '      "https://ga.jspm.io/": {\n' +
    '        "object-assign": "https://ga.jspm.io/npm:object-assign@4.1.1/index.js"\n' +
    '      }\n' +
    '    }\n' +
    '  }\n' +
    '  </script>\n' +
    '  <script type="module">import \'react\'</script>\n'
);

html = `
  <!doctype html>
  <script type="module">import 'react'</script>
`;

pins = await generator.addMappings(html);

assert.strictEqual(
  await generator.htmlInject(html, { pins, whitespace: false }),
  '\n' +
    '  <!doctype html>\n' +
    '  <!-- Generated by @jspm/generator - https://github.com/jspm/generator -->\n' +
    `  <script async src="${esmsUrl}" crossorigin="anonymous"></script>\n` +
    '  <script type="importmap">{"imports":{"react":"https://ga.jspm.io/npm:react@17.0.2/index.js"},"scopes":{"https://ga.jspm.io/":{"object-assign":"https://ga.jspm.io/npm:object-assign@4.1.1/index.js"}}}</script>\n' +
    '  <script type="module">import \'react\'</script>\n'
);

generator = new Generator({
  rootUrl: new URL('./local', import.meta.url),
  env: ['production', 'browser'],
  resolutions: {
    react: '17'
  }
});

html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>A Title</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;

pins = await generator.addMappings(html);

assert.strictEqual(
  await generator.htmlInject(html, { pins }),
  `
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Generated by @jspm/generator - https://github.com/jspm/generator -->
  <script async src="${esmsUrl}" crossorigin="anonymous"></script>
  <script type="importmap">
  {}
  </script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>A Title</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`
);
