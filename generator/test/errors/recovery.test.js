import { Generator } from "@jspm/generator";
import assert from "assert";

const generator = new Generator({
  mapUrl: import.meta.url,
  defaultProvider: "jspm.io",
  env: ["production", "browser"],
});

try {
  await generator.install("package-that-does-not-exist");
  assert.fail("Should Error");
} catch (e) {
  assert.ok(e.message.includes("Unable to resolve"));
}

const t = setTimeout(() => {
  assert.fail("Process stalled");
}, 5000);

await generator.install("react@16");

const json = generator.getMap();
assert.strictEqual(
  json.imports.react,
  "https://ga.jspm.io/npm:react@16.14.0/index.js"
);
clearTimeout(t);
