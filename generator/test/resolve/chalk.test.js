import { Generator } from "@jspm/generator";
import assert from "assert";

if (typeof document === "undefined") {
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: "nodemodules",
    commonJS: true,
  });

  await generator.install("chalk");
  const json = generator.getMap();
  assert.equal(Object.keys(json.imports).length, 5);

  // The exact scope name changes depending on whether chalk's dependencies are
  // installed as primaries or secondaries on the server where this test runs:
  const scopeKeys = Object.keys(json.scopes);
  assert.equal(scopeKeys.length, 1);
  assert.equal(Object.keys(json.scopes[scopeKeys[0]]).length, 4);
}
