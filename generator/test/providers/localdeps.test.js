import { Generator } from "@jspm/generator";
import assert from "assert";

// Test that local "file:..."-type depencies are correctly linked into the
// node_modules folder:

let generator = new Generator({
  mapUrl: new URL("./localdeps/pkg/importmap.json", import.meta.url),
  defaultProvider: "nodemodules",
});

await generator.link("./index.js");
const map = generator.getMap();
assert.strictEqual(map.imports?.["tar"], "./node_modules/tar/index.js");
assert.strictEqual(map.imports?.["dep"], "./node_modules/dep/index.js");
