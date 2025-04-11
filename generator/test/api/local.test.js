import { Generator } from "@jspm/generator";
import assert from "assert";

const generator = new Generator({
  mapUrl: import.meta.url,
  defaultProvider: "jspm.io",
  env: ["production", "browser"],
});

await generator.install({ target: "./local/pkg", subpath: "./custom" });
const json = generator.getMap();
assert.strictEqual(json.imports["localpkg/custom"], "./local/pkg/a.js");
