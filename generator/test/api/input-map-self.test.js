import { Generator } from "@jspm/generator";
import assert from "assert";

const generator = new Generator({
  mapUrl: "about:blank",
  inputMap: {
    imports: {
      "@babel/core":
        "https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.8/nodelibs/@empty.js",
      "@babel/preset-typescript":
        "https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.8/nodelibs/@empty.js",
    },
  },
  ignore: ["@babel/core", "@babel/preset-typescript"],
  env: ["source"],
});

await generator.install(new URL("../../", import.meta.url).href);

const json = generator.getMap();

assert.ok(JSON.stringify(json).length < 2000);
