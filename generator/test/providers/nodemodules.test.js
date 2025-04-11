import { Generator } from "@jspm/generator";
import assert from "assert";

let generator = new Generator({
  mapUrl: new URL("../../", import.meta.url),
  defaultProvider: "nodemodules",
  commonJS: true,
});

await generator.install("chalk");

let json = generator.getMap();
assert.strictEqual(
  json.imports["chalk"],
  "./node_modules/chalk/source/index.js"
);

// Check that we can install using the jspm.io provider, and then go back to
// the nodemodules provider, without affecting the resolutions:

generator = new Generator({
  mapUrl: new URL("../../", import.meta.url),
  defaultProvider: "jspm.io",
  inputMap: json,
  commonJS: true,
});
await generator.install();
json = generator.getMap();

generator = new Generator({
  mapUrl: new URL("../../", import.meta.url),
  defaultProvider: "nodemodules",
  inputMap: json,
  commonJS: true,
});
await generator.install();
json = generator.getMap();
assert.strictEqual(
  json.imports["chalk"],
  "./node_modules/chalk/source/index.js"
);
