import { Generator } from "@jspm/generator";
import assert from "assert";

const generator = new Generator({
  mapUrl: import.meta.url,
  defaultProvider: "jspm.io",
  env: ["production", "browser"],
});

await generator.install("react@16");
const json = generator.getMap();
assert.strictEqual(
  json.imports.react,
  "https://ga.jspm.io/npm:react@16.14.0/index.js"
);

assert.strictEqual(
  generator.importMap.resolve("react"),
  "https://ga.jspm.io/npm:react@16.14.0/index.js"
);

const meta = generator.getAnalysis(
  "https://ga.jspm.io/npm:react@16.14.0/index.js"
);
assert.deepStrictEqual(meta, {
  format: "esm",
  staticDeps: ["./cjs/react.production.min.js", "object-assign"],
  dynamicDeps: [],
  cjsLazyDeps: [],
});
