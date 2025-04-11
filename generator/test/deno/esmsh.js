import { Generator } from "@jspm/generator";
import { denoExec } from "#test/deno";

const generator = new Generator({
  mapUrl: import.meta.url,
  env: ["production", "deno", "module"],
  defaultProvider: "esm.sh",
});

// Install the NPM assert shim and use it to test itself!
// The esm.sh deno build for assert@2.0.0 is broken, so we use an old version.
await generator.install("npm:assert@1.5.0");
await denoExec(
  generator.getMap(),
  `
  import { ok } from 'assert';
  ok(1 === 1);
  `
);
