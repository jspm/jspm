import { Generator } from "@jspm/generator";
import assert from "assert";

const generator = new Generator({
  env: ["node", "development"],
});

await generator.install("react-dom");

const json = generator.getMap();

assert.strictEqual(
  json.scopes["https://ga.jspm.io/"]["node:process"],
  undefined
);
