import { Generator } from "@jspm/generator";
import assert from "assert";

const generator = new Generator({
  mapUrl: import.meta.url,
  commonJS: true,
});

// Should not throw, index file doesn't use CJS:
await generator.install("./unusedcjspkg");

// Should throw, uses module global:
await (async () => {
  try {
    await generator.install("./unusedcjspkg/cjs.js");
    assert(false);
  } catch {}
})();

await generator.install({ target: "./cjspkg", subpath: "./browser.js" });
assert.deepStrictEqual(generator.getMap(), {
  imports: {
    "./cjspkg/browser-dep-exclude.js":
      "https://ga.jspm.io/npm:@jspm/core@2.1.0/nodelibs/@empty.js",
    "cjspkg/browser.js": "./cjspkg/browser.js",
    unusedcjspkg: "./unusedcjspkg/index.js",
  },
  scopes: {
    "./cjspkg/": {
      jquery: "https://ga.jspm.io/npm:jquery@3.7.1/dist/jquery.js",
    },
  },
});
