import { Generator } from "@jspm/generator";
import assert from "assert";

if (typeof document === "undefined") {
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: "nodemodules",
    commonJS: true,
  });

  // await generator.link('./cjspkg/mod.js');
  await generator.link("./cjspkg/mod-shim.js");

  const json = generator.getMap();

  assert.deepStrictEqual(json, {
    imports: {
      "process/": "./cjspkg/node_modules/process/index.js",
    },
  });
}
