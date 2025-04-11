import { Generator } from "@jspm/generator";
import { deepStrictEqual, strictEqual } from "assert";

const generator = new Generator({
  mapUrl: import.meta.url,
  defaultProvider: "jspm.io",
  env: ["production", "browser"],
});

await generator.install("@shopify/polaris@13.4.0/build/esm/styles.css");
await generator.install({ target: "./local/assets", subpath: "./css" });
await generator.install({ target: "./local/assets", subpath: "./json" });
await generator.install({ target: "./local/assets", subpath: "./wasm" });

const json = generator.getMap();

deepStrictEqual(Object.keys(json.imports), [
  "@shopify/polaris/build/esm/styles.css",
  "assets/css",
  "assets/json",
  "assets/wasm",
]);
strictEqual(json.scopes["./local/assets/"]["#asdf"], "./local/assets/file.js");
