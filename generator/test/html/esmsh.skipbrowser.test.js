import { Generator } from '@jspm/generator';
import assert from 'assert';
import { SemverRange } from 'sver';

if (process.env.SKIP_ESMSH) {
  console.log('Skipping esm.sh test — SKIP_ESMSH set');
  process.exit(0);
}

const generator = new Generator({
  mapUrl: new URL('./local/page.html', import.meta.url),
  env: ['production', 'browser'],
  defaultProvider: 'esm.sh'
});

const esmsPkg = await generator.traceMap.resolver.pm.resolveLatestTarget(
  { name: 'es-module-shims', registry: 'npm', range: new SemverRange('*') },
  generator.traceMap.installer.defaultProvider
);
let pins, html;

html = `
<!doctype html>
<script type="module">
  import 'react';
</script>
`;
pins = await generator.addMappings(html);

assert((await generator.htmlInject(html, { pins })).includes('https://esm.sh/*'));
