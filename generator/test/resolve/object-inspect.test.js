import { Generator } from "@jspm/generator";
import assert from "assert";

const generator = new Generator({
  mapUrl: import.meta.url,
});

await generator.install("object-inspect@1.12.0");

const json = generator.getMap();

assert.equal(Object.keys(json.imports).length, 1);
assert.equal(Object.keys(json.scopes).length, 1);
