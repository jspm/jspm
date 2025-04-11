import { Generator } from "@jspm/generator";
import assert from "assert";

const generator = new Generator({
  mapUrl: import.meta.url,
  env: ["source"],
});

await generator.install("@jspm/generator");

const generatorUrl = new URL("../../lib/generator.js", import.meta.url).href;

assert.strictEqual(generator.resolve("@jspm/generator"), generatorUrl);
assert.strictEqual(
  generator.resolve("#fetch", generatorUrl),
  new URL("./common/fetch-native.js", generatorUrl).href
);
