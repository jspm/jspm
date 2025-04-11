import { Generator } from "@jspm/generator";
import assert from "assert";

const generator = new Generator({
  mapUrl: import.meta.url,
  defaultProvider: "jspm.io",
  env: ["production", "browser"],
});

await generator.install(
  "@lit-async/ssr-client@1.0.0-rc.1/directives/server-until.js"
);
const json = generator.getMap();
assert.strictEqual(
  json.imports["@lit-async/ssr-client/directives/server-until.js"],
  "https://ga.jspm.io/npm:@lit-async/ssr-client@1.0.0-rc.1/directives/server-until.js"
);
