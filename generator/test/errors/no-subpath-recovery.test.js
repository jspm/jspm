import { Generator } from "@jspm/generator";
import assert from "assert";

const generator = new Generator();

try {
  await generator.install({
    target: "@material-ui/icons@4.11.2",
    subpath: "./AutorenewOutline",
  });
  assert.fail("Should Error");
} catch (e) {
  assert.ok(e.message.includes("Module not found"));
}

const t = setTimeout(() => {
  assert.fail("Process stalled");
}, 5000);

await generator.install("react@16");

const json = generator.getMap();

assert.strictEqual(
  json.imports.react,
  "https://ga.jspm.io/npm:react@16.14.0/dev.index.js"
);
clearTimeout(t);
