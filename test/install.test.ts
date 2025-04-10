import { test } from "node:test";
import assert from "assert";
import type { IImportMap } from "../src/types.ts";
import { run } from "./scenarios.ts";

test("Basic install", async () => {
  await run({
    commands: ["jspm install react@17.0.1 react-dom@17.0.1"],
    validationFn: async (files: Map<string, string>) => {
      assert.equal(files.size, 2);

      const map: IImportMap = JSON.parse(files.get("importmap.json"));
      assert.strictEqual(
        map.imports.react,
        "https://ga.jspm.io/npm:react@17.0.1/dev.index.js"
      );
    },
  });
});

test("Install with production environment", async () => {
  await run({
    commands: ["jspm install react@17.0.1 react-dom@17.0.1 -e production"],
    validationFn: async (files: Map<string, string>) => {
      assert.equal(files.size, 2);

      const map = JSON.parse(files.get("importmap.json"));
      assert.strictEqual(
        map.imports.react,
        "https://ga.jspm.io/npm:react@17.0.1/index.js"
      );
    },
  });
});

test("Install with deno environment", async () => {
  await run({
    commands: ["jspm install react@17.0.1 react-dom@17.0.1 -e deno"],
    validationFn: async (files: Map<string, string>) => {
      assert.equal(files.size, 2);

      const map = JSON.parse(files.get("importmap.json"));
      assert.strictEqual(
        map.imports.react,
        "https://ga.jspm.io/npm:react@17.0.1/dev.index.js"
      );

      // "deno" should replace "browser" env:
      assert.deepEqual(map.env, ["deno", "development", "module"]);
    },
  });
});

test("Install with both deno and browser environments", async () => {
  await run({
    commands: ["jspm install react@17.0.1 react-dom@17.0.1 -e deno,browser"],
    validationFn: async (files: Map<string, string>) => {
      assert.equal(files.size, 2);

      const map = JSON.parse(files.get("importmap.json"));
      assert.strictEqual(
        map.imports.react,
        "https://ga.jspm.io/npm:react@17.0.1/dev.index.js"
      );

      // Both "deno" and "browser" envs should be present:
      assert.deepEqual(map.env, ["browser", "deno", "development", "module"]);
    },
  });
});

test("Install using an alias for the package", async () => {
  await run({
    commands: ["jspm install -e production custom=react@17.0.1"],
    validationFn: async (files: Map<string, string>) => {
      assert.equal(files.size, 2);

      const map = JSON.parse(files.get("importmap.json"));
      assert.strictEqual(
        map.imports.custom,
        "https://ga.jspm.io/npm:react@17.0.1/index.js"
      );
    },
  });
});

test("Reinstall, changing from development to production", async () => {
  await run({
    commands: [
      "jspm install -e development react@17.0.1",
      "jspm install -e production",
    ],
    validationFn: async (files: Map<string, string>) => {
      assert.equal(files.size, 2);

      const map = JSON.parse(files.get("importmap.json"));
      assert(map.imports.react);
      assert(!map.imports.react.includes("dev"));
    },
  });
});

test("Installing should respect the existing import map's env field", async () => {
  await run({
    commands: ["jspm install -e deno,production react@17.0.1", "jspm install"],
    validationFn: async (files: Map<string, string>) => {
      assert.equal(files.size, 2);

      const map = JSON.parse(files.get("importmap.json"));
      assert.deepEqual(map.env, ["deno", "module", "production"]);
      assert(map.imports.react);
    },
  });
});

test("Swapping providers using the -p flag", async () => {
  await run({
    commands: ["jspm install -p jsdelivr -e production,browser react@17.0.1"],
    validationFn: async (files: Map<string, string>) => {
      assert.equal(files.size, 2);

      const map = JSON.parse(files.get("importmap.json"));
      assert.strictEqual(
        map.imports.react,
        "https://cdn.jsdelivr.net/npm/react@17.0.1/index.js"
      );
    },
  });
});

test("Using different output map with additive behavior", async () => {
  await run({
    commands: [
      "jspm install -e production,browser react@17.0.1 lodash@4.17.21",
      "jspm install -o output.importmap.json lodash", // extract lodash
    ],
    validationFn: async (files: Map<string, string>) => {
      assert.equal(files.size, 3);
      assert(files.get("importmap.json"));
      assert(files.get("output.importmap.json"));

      const map = JSON.parse(files.get("output.importmap.json"));
      assert.strictEqual(
        map.imports.react,
        "https://ga.jspm.io/npm:react@17.0.1/index.js"
      );
      assert.strictEqual(
        map.imports.lodash,
        "https://ga.jspm.io/npm:lodash@4.17.21/lodash.js"
      );
    },
  });
});

test("Installing should always bump the version if possible", async () => {
  await run({
    commands: ["jspm install react@17.0.1", "jspm install react"],
    validationFn: async (files: Map<string, string>) => {
      const map: IImportMap = JSON.parse(files.get("importmap.json"));
      assert.notStrictEqual(
        map.imports.react,
        "https://cdn.jsdelivr.net/npm/react@17.0.1/index.js"
      );
    },
  });
});