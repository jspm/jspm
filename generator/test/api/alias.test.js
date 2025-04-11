import { Generator } from "@jspm/generator";
import assert from "assert";

const generator = new Generator({
  mapUrl: import.meta.url,
  defaultProvider: "jspm.io",
  env: ["production", "browser"],
});

await generator.install({ target: "react@16", alias: "custom" });
const json = generator.getMap();
assert.strictEqual(
  json.imports.custom,
  "https://ga.jspm.io/npm:react@16.14.0/index.js"
);
