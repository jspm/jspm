import { test } from "node:test";
import assert from "assert";
import { mapFile, run } from "./scenarios.ts";

let importMap: Map<string, string>;

test("setup", async () => {
  importMap = await mapFile("test/fixtures/importmap.json");
});

test("linking inline modules in HTML", async () => {
  await run({
    files: await mapFile([
      "test/fixtures/inlinemodules.html",
      "test/fixtures/a.js",
      "test/fixtures/b.js",
    ]),
    commands: ["jspm link inlinemodules.html -o inlinemodules.html"],
    validationFn: async (files) => {
      // The inline import of 'react-dom' should be linked:
      const html = files.get("inlinemodules.html");
      assert(html.includes("react-dom"));
    },
  });
});

test("linking specific package to HTML", async () => {
  await run({
    files: importMap,
    commands: ["jspm link react -o index.html"],
    validationFn: async (files: Map<string, string>) => {
      // The index.html should contain the react version from the import map,
      // but none of the other pins, and no preloads or integrity attributes:
      assert(files.get("index.html").includes("npm:react@17.0.1"));
      assert(!files.get("index.html").includes("npm:lodash@4.17.21"));
      assert(!files.get("index.html").includes("npm:react-dom@17.0.1"));
      assert(!files.get("index.html").includes("preload"));
      assert(!files.get("index.html").includes("integrity"));
    },
  });
});

test("linking all packages to HTML", async () => {
  await run({
    files: importMap,
    commands: ["jspm link -o index.html"],
    validationFn: async (files: Map<string, string>) => {
      // The index.html should contain the import version of everything, but
      // no preloads or integrity attributes:
      assert(files.get("index.html").includes("npm:react@17.0.1"));
      assert(files.get("index.html").includes("npm:lodash@4.17.21"));
      assert(files.get("index.html").includes("npm:react-dom@17.0.1"));
      assert(!files.get("index.html").includes("preload"));
      assert(!files.get("index.html").includes("integrity"));
    },
  });
});

test("linking with static preload", async () => {
  await run({
    files: importMap,
    commands: ["jspm link react -o index.html --preload static"],
    validationFn: async (files: Map<string, string>) => {
      // The index.html should contain the react version from the import map,
      // and integrities for it, but nothing else:
      assert(files.get("index.html").includes("npm:react@17.0.1"));
      assert(!files.get("index.html").includes("npm:lodash@4.17.21"));
      assert(!files.get("index.html").includes("npm:react-dom@17.0.1"));
      assert(files.get("index.html").includes("preload"));
      assert(!files.get("index.html").includes("integrity"));
    },
  });
});

test("installing with preload and integrity", async () => {
  await run({
    files: importMap,
    commands: ["jspm install react -o index.html --preload --integrity"],
    validationFn: async (files: Map<string, string>) => {
      // The index.html should contain all the pins, and integrities for them:
      // NOTE: this will break if we change the CDN build!
      const reactIntegrity =
        "sha384-y5ozcpbgsrkQFNWIQTtiGWstK6sGqPJu5Ptnvn8lAqJXDNI7ZdE9fMsYVgrq3PRG";
      assert(files.get("index.html").includes("npm:react@17.0.1"));
      assert(files.get("index.html").includes("npm:lodash@4.17.21"));
      assert(files.get("index.html").includes("npm:react-dom@17.0.1"));
      assert(files.get("index.html").includes("preload"));
      assert(files.get("index.html").includes(reactIntegrity));
    },
  });
});