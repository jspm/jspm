import { Generator } from "@jspm/generator";
import assert from "assert";

const generator = new Generator({
  defaultProvider: "jsdelivr",
});

await generator.install("@cubejs-client/core@0.35.23");
const json = generator.getMap();
assert(Object.keys(json.imports).length === 1);
