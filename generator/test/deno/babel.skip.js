import { Generator } from "@jspm/generator";
import { denoExec } from "#test/deno";

const generator = new Generator({
  env: ["node", "deno"],
});

await generator.install("@babel/core");
await generator.install("assert");

const map = generator.getMap();

await denoExec(
  map,
  `
  import babel from '@babel/core';
  import assert from 'assert';

  const { code } = babel.transform('var p = 5');
  assert.strictEqual(code, 'var p = 5;');
`
);
