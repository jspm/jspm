import { Generator } from "@jspm/generator";
import assert from "assert";

const generator = new Generator({
  mapUrl: import.meta.url,
  defaultProvider: "nodemodules",
});

await generator.install({
  target: new URL("./wildcard", import.meta.url).href,
  subpath: "./some/module",
});

const json = generator.getMap();

assert.deepStrictEqual(json, {
  imports: {
    "wildcard/some/module": "./wildcard/a-module.js",
  },
});
