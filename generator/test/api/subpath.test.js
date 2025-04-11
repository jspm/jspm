import { Generator } from "@jspm/generator";
import assert from "assert";

const generator = new Generator({
  mapUrl: import.meta.url,
  defaultProvider: "jspm.io",
  env: ["production", "browser"],
});

await generator.install({ target: "lit@2.0.0-rc.1", subpath: "./html.js" });
const json = generator.getMap();
assert.strictEqual(
  json.imports["lit/html.js"],
  "https://ga.jspm.io/npm:lit@2.0.0-rc.1/html.js"
);
