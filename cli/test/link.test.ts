import { test } from "node:test";
import assert from "assert";
import { mapFile, run } from "./scenarios.ts";

let scripts: Map<string, string>;
let importMap: Map<string, string>;
let htmlFile: Map<string, string>;
let inlineModules: Map<string, string>;
let inlineHtml: Map<string, string>;
let indexScript: Map<string, string>;

test("setup", async () => {
  scripts = await mapFile(["fixtures/a.js", "fixtures/b.js"]);
  importMap = await mapFile("fixtures/importmap.json");
  htmlFile = await mapFile("fixtures/index.html");
  inlineModules = await mapFile("fixtures/inlinemodules.html");
  inlineHtml = await mapFile("fixtures/inlinehtml.js");
  indexScript = await mapFile("fixtures/index.js");
});

test("Basic link from a package without an existing import map", async () => {
  await run({
    files: scripts,
    commands: ["jspm link ./a.js"],
    validationFn: async (files: Map<string, string>) => {
      const map = JSON.parse(files.get("importmap.json")!);
      assert(map.imports["react-dom"]); // transitive dependency
    },
  });
});

test("Dependency constraints are picked up from input map", async () => {
  await run({
    files: new Map([...scripts, ...importMap]),
    commands: ["jspm link ./a.js"],
    validationFn: async (files: Map<string, string>) => {
      const map = JSON.parse(files.get("importmap.json")!);
      assert(map.imports["react-dom"]); // transitive dependency
      assert.strictEqual(
        map.imports["react-dom"],
        "https://ga.jspm.io/npm:react-dom@17.0.1/index.js"
      );
    },
  });
});

test("Injecting the output into a non-existent HTML file should create one", async () => {
  await run({
    files: new Map([...scripts, ...importMap]),
    commands: ["jspm link ./a.js -o index.html"],
    validationFn: async (files: Map<string, string>) => {
      const html = files.get("index.html");
      assert(html && html.includes("react-dom@17.0.1"));
    },
  });
});

test("Injecting the output into an existing HTML file should maintain content", async () => {
  await run({
    files: new Map([...scripts, ...importMap, ...htmlFile]),
    commands: ["jspm link ./a.js -o index.html"],
    validationFn: async (files: Map<string, string>) => {
      const html = files.get("index.html");
      assert(html && html.includes("react-dom@17.0.1"));
      assert(html && html.includes("<title>Test</title>"));
    },
  });
});

test("Running a link on an HTML file should trace all inline imports", async () => {
  await run({
    files: new Map([...scripts, ...importMap, ...inlineModules]),
    commands: ["jspm link -m inlinemodules.html"],
    validationFn: async (files: Map<string, string>) => {
      // No version information because "-m index.html" sets the input/output
      // source files to "index.html", so "importmap.json" is ignored:
      const html = files.get("inlinemodules.html");
      assert(html && html.includes("react-dom")); // from ./a.js
    },
  });
});

test("Link with output to HTML file should include versions from importmap", async () => {
  await run({
    files: new Map([...scripts, ...importMap, ...inlineModules]),
    commands: ["jspm link -o inlinemodules.html"],
    validationFn: async (files: Map<string, string>) => {
      const html = files.get("inlinemodules.html");
      assert(html && html.includes("react-dom@17.0.1")); // from ./a.js
    },
  });
});

test("Linking 'index.js' when no local file exists should link against npm package", async () => {
  await run({
    commands: ["jspm link index.js"],
    validationFn: async (files: Map<string, string>) => {
      const map = JSON.parse(files.get("importmap.json")!);
      assert(map.imports["index.js"]);
    },
  });
});

test("Linking 'index.js' when local file exists should link against local file", async () => {
  await run({
    files: indexScript,
    commands: ["jspm link index.js"],
    validationFn: async (files: Map<string, string>) => {
      const map = JSON.parse(files.get("importmap.json")!);
      assert(!map.imports["index.js"]);
      assert(map.imports.react); // transitive dependency
    },
  });
});

test("Linking '%index.js' should link against npm package even when local file exists", async () => {
  await run({
    files: indexScript,
    commands: ["jspm link %index.js"],
    validationFn: async (files: Map<string, string>) => {
      const map = JSON.parse(files.get("importmap.json")!);
      assert(map.imports["index.js"]);
      assert(!map.imports.react);
    },
  });
});

test("Linking HTML file directly should link all inline modules", async () => {
  await run({
    files: new Map([...scripts, ...inlineModules, ...importMap]),
    commands: ["jspm link inlinemodules.html"],
    validationFn: async (files: Map<string, string>) => {
      const map = JSON.parse(files.get("importmap.json")!);
      assert(map.imports["react-dom"]); // transitive dependency
      assert.strictEqual(
        map.imports["react-dom"],
        "https://ga.jspm.io/npm:react-dom@17.0.1/index.js"
      );
    },
  });
});

test("CLI shouldn't be confused by JS file with inline HTML string", async () => {
  await run({
    files: new Map([...scripts, ...inlineModules, ...inlineHtml]),
    commands: ["jspm link inlinehtml.js"],
    validationFn: async (files: Map<string, string>) => {
      const map = JSON.parse(files.get("importmap.json")!);

      // Should _not_ have linked the module in the inline HTML string:
      assert(!map.imports?.["react-dom"]);
    },
  });
});

test("Support HTML as import map when no importmap.json exists", async () => {
  await run({
    files: new Map([...htmlFile, ["app.js", 'import "react"']]),
    commands: ["jspm link index.html -o index.html --integrity"],
    validationFn: async (files: Map<string, string>) => {
      const source = files.get("index.html")!;
      assert(source.includes('"integrity"'));
      assert(
        source.includes(
          '"./app.js": "sha384-f+bWmpnsmFol2CAkqy/ALGgZsi/mIaBIIhbvFLVuQzt0LNz96zLSDcz1fnF2K22q"'
        )
      );
      assert(
        source.includes(
          '"https://ga.jspm.io/npm:react@18.2.0/dev.index.js": "sha384-eSJrEMXot96AKVLYz8C1nY3CpLMuBMHIAiYhs7vfM09SQo+5X+1w6t3Ldpnw+VWU"'
        )
      );
    },
  });
});
