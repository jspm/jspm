import { Generator } from "@jspm/generator";
import assert from "assert";

// TODO(bubblyworld): This test should be failing for two reasons:
// 1. Generator installs take package specifiers, so self-reference installs
//    shouldn't be possible (they're a _module_ resolution thing).
// 2. The current version of @jspm/generator is >1.0.0, so this shouldn't
//    be doing a local install anyway.

const generator = new Generator({
  mapUrl: import.meta.url,
  env: ["source"],
});

const { staticDeps, dynamicDeps } = await generator.install(
  "@jspm/generator@1.0.0-beta.13"
);

assert.ok(staticDeps.length < 50);
assert.ok(dynamicDeps.length > 100);

const json = generator.getMap();

assert.strictEqual(json.imports["@jspm/generator"], "../../lib/generator.js");
assert.strictEqual(
  json.scopes["../../"]["#fetch"],
  "../../lib/common/fetch-native.js"
);
assert.strictEqual(
  json.scopes["https://ga.jspm.io/"]["semver"],
  "https://ga.jspm.io/npm:semver@6.3.1/semver.js"
);
