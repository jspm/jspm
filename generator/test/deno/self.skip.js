import { Generator } from "@jspm/generator";
import { denoExec } from "#test/deno";

const generator = new Generator({
  mapUrl: "about:blank",
  env: ["production", "node", "deno", "module", "source"],

  // Hack - deno bombs on the circular imports in @babel/core@7.21.0, despite
  // it working fine in the browser and node. So we patch it:
  resolutions: {
    "@babel/core": "~7.20.0",
    "@babel/generator": "7.20.0",
    "@babel/helper-member-expression-to-functions": "7.20.7",
  },
});

const targetUrl = new URL("../../", import.meta.url).href;
await generator.install({ alias: "@jspm/generator", target: targetUrl });
const map = generator.getMap();

await denoExec(
  generator.getMap(),
  `
  import { Generator } from '@jspm/generator';
  import { assertEquals } from "https://deno.land/std@0.100.0/testing/asserts.ts";

  const generator = new Generator({
    mapUrl: 'about:blank',
    env: ['production', 'node', 'deno', 'module', 'source']
  });

  // inception!
  await generator.install({ alias: '@jspm/generator', target: ${JSON.stringify(
    targetUrl
  )} });
  const map = generator.getMap();

  assertEquals(map.imports, ${JSON.stringify(map.imports)})
`
);
