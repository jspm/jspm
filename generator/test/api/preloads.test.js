import { Generator } from "@jspm/generator";
import assert from "assert";

const generator = new Generator();

const { staticDeps } = await generator.install("react@16");
assert.strictEqual(staticDeps.length, 5);

{
  const { staticDeps } = await generator.install({
    alias: "react17",
    target: "react@17",
  });
  assert.strictEqual(staticDeps.length, 7);
}

const json = generator.getMap();
assert.strictEqual(Object.keys(json.imports).length, 2);
