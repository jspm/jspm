import { test } from "node:test";
import assert from "assert";
import {
  mapDirectory,
  mapFile,
  run
} from "./scenarios.ts";

let importMap: Map<string, string>;

test("setup", async () => {
  importMap = await mapFile("test/fixtures/importmap.json");
});

test("Inline importmap should be linked with integrity attribute", async () => {
  await run({
    files: importMap,
    commands: ["jspm link react -o index.html --integrity"],
    validationFn: async (files: Map<string, string>) => {
      const html = files.get("index.html");
      assert(html.includes("integrity"));
    },
  });
});

test("Generated importmap should have integrity attribute", async () => {
  await run({
    files: importMap,
    commands: ["jspm link --integrity"],
    validationFn: async (files: Map<string, string>) => {
      const map = JSON.parse(files.get("importmap.json"));
      assert(map.integrity);
    },
  });
});

test("Scenario should detect provider and add integrity attribute", async () => {
  await run({
    files: await mapFile("test/fixtures/unpkg.importmap.json"),
    commands: [
      "jspm link -m unpkg.importmap.json -o importmap.json --integrity",
    ],
    validationFn: async (files: Map<string, string>) => {
      const map = JSON.parse(files.get("importmap.json"));
      assert(map.integrity);
    },
  });
});

test("Scenario using nodemodules provider should add integrity attribute", async () => {
  await run({
    files: await mapDirectory("test/fixtures/scenario_provider_swap"),
    commands: ["jspm install --provider nodemodules --integrity"],
    validationFn: async (files) => {
      const map = JSON.parse(files.get("importmap.json"));
      assert(map.integrity);
    },
  });
});

// TODO: Disabled pending JSR support
// test("Installing package from denoland with integrity attribute", async () => {
//   await run({
//     files: new Map(),
//     commands: ["jspm install denoland:zod --integrity"],
//     validationFn: async (files) => {
//       const map = JSON.parse(files.get("importmap.json"));
//       assert(map.imports.zod.includes("deno.land"));
//       assert(map.integrity);
//     },
//   });
// });

test("Installing package from skypack with integrity attribute", async () => {
  await run({
    files: new Map(),
    commands: ["jspm install lit --provider skypack --integrity"],
    validationFn: async (files) => {
      const map = JSON.parse(files.get("importmap.json"));
      assert(map.imports.lit.includes("cdn.skypack.dev"));
      assert(map.integrity);
    },
  });
});