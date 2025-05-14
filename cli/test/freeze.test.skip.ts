import { test } from "node:test";
import assert from "assert";
import { run } from "./scenarios.ts";

let importMap: Map<string, string>;

test("setup", async () => {
  importMap = new Map([
    [
      "importmap.json",
      JSON.stringify({
        imports: {
          fs: "https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.20/nodelibs/node/fs.js",
        },
      }),
    ],
  ]);
});

test("Installing without freeze should bump the version of core", async () => {
  await run({
    files: importMap,
    commands: ["jspm install node:process"],
    validationFn: async (files: Map<string, string>) => {
      const map = JSON.parse(files.get("importmap.json"));
      assert(!map.imports.fs.includes("2.0.0-beta.20"));
      assert(!map.imports.process.includes("2.0.0-beta.20"));
    },
  });
});

test("Installing with freeze should keep it fixed", async () => {
  await run({
    files: importMap,
    commands: ["jspm install node:process --freeze"],
    validationFn: async (files: Map<string, string>) => {
      const map = JSON.parse(files.get("importmap.json"));
      assert(map.imports.fs.includes("2.0.0-beta.20"));
      assert(map.imports.process.includes("2.0.0-beta.20"));
    },
  });
});
