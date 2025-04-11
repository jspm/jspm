import { Generator } from "@jspm/generator";
import { denoExec } from "#test/deno";

const generator = new Generator({
  mapUrl: "about:blank",
  env: ["production", "node", "deno", "module"],
});

await generator.install("chalk");

await denoExec(generator.getMap(), `import chalk from 'chalk';`);
