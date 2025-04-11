import { Generator } from "@jspm/generator";
import assert from "assert";

const generator = new Generator({
  mapUrl: import.meta.url,
  defaultProvider: "nodemodules",
  commonJS: true,
});

await generator.install("./legacypkg");

const json = generator.getMap();

assert.strictEqual(json.imports["legacypkg"], "./legacypkg/m/index.js");
