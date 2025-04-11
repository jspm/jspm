import { Generator } from "@jspm/generator";
import assert from "assert";

const generator = new Generator({
  mapUrl: import.meta.url,
  defaultProvider: "jspm.io",
  env: ["production", "browser"],
});

await generator.install({ target: "./local/pkg", subpath: "./withdep" });
const json = generator.getMap();

assert.strictEqual(json.imports["localpkg/withdep"], "./local/pkg/b.js");
assert.strictEqual(json.scopes["./local/pkg/"].dep, "./local/dep/main.js");
