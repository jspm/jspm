import { Generator } from "@jspm/generator";
import assert from "assert";

const generator = new Generator({
  mapUrl: import.meta.url,
  defaultProvider: "jspm.io",
  env: ["production", "browser"],
});

await Promise.all([
  generator.install("react@16"),
  generator.install("lit-element@2.5.1"),
]);
const json = generator.getMap();

assert.strictEqual(
  json.imports.react,
  "https://ga.jspm.io/npm:react@16.14.0/index.js"
);
assert.strictEqual(
  json.imports["lit-element"],
  "https://ga.jspm.io/npm:lit-element@2.5.1/lit-element.js"
);
