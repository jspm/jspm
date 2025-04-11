import { Generator } from "@jspm/generator";
import assert from "assert";

const generator = new Generator({
  mapUrl: import.meta.url,
  defaultProvider: "jspm.io",
  env: ["production", "browser"],
});

await generator.install({ target: "@pyscript/core@0.4.21" });
const json = generator.getMap();
assert.ok(json);
