import { Generator } from '@jspm/generator';
import assert from 'assert';
import { SemverRange } from 'sver';

const generator = new Generator({
  rootUrl: new URL('./local', import.meta.url),
  env: ['production', 'browser']
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

const html = `<!DOCTYPE html>

<script type="importmap"></script>
`;

const pins = await generator.addMappings(html);
const res = await generator.htmlInject(html, { pins, preload: true });

assert.strictEqual(
  res,
  '<!DOCTYPE html>\n' +
    '\n' +
    '<!-- Generated by @jspm/generator - https://github.com/jspm/generator -->\n' +
    `<script async src="${esmsUrl}" crossorigin="anonymous"></script>\n` +
    '<script type="importmap">\n' +
    '{}\n' +
    '</script>\n'
);
