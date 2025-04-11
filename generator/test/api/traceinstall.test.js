import { Generator } from "@jspm/generator";
import assert from "assert";

const generator = new Generator({
  mapUrl: import.meta.url,
  defaultProvider: "jspm.io",
  env: ["production", "browser"],
});

await generator.link("./local/pkg/b.js");

const json = generator.getMap();

assert.strictEqual(json.imports.dep, "./local/dep/main.js");
