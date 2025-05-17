import { test } from "node:test";
import assert from "assert";
import { run } from "./scenarios.ts";

test("Output to importmap.js when it exists but importmap.json doesn't", async () => {
  await run({
    files: new Map([
      [
        "importmap.js",
        `/** 
 * Map injection script, polyfilling native support for external import map sources 
 */
const map = {
  "imports": {
    "lit": "https://cdn.jsdelivr.net/npm/lit@2.7.5/index.js"
  }
};
const mapUrl = document.currentScript.src;
const rebase = imports => Object.fromEntries(Object.entries(imports || {}).map(([k, v]) => [k, new URL(v, mapUrl).href]));
document.head.appendChild(Object.assign(document.createElement("script"), { 
  type: "importmap", 
  innerHTML: JSON.stringify({
    imports: rebase(map.imports),
    scopes: map.scopes ? Object.fromEntries(Object.entries(map.scopes).map(([k, v]) => [new URL(k, mapUrl).href, rebase(v)])) : undefined,
    integrity: map.integrity ? Object.fromEntries(Object.entries(map.integrity).map(([k, v]) => [new URL(k, mapUrl).href, v])) : undefined
  })
}));`,
      ],
    ]),
    commands: ["jspm install --out importmap.js react"],
    validationFn: async (files: Map<string, string>) => {
      // importmap.json should not be created since we specified output
      assert(
        !files.has("importmap.json"),
        "importmap.json should not be created"
      );

      // importmap.js should be updated
      assert(files.has("importmap.js"), "importmap.js should exist");

      // Verify the JS file contains the expected map data
      const jsContent = files.get("importmap.js")!;
      assert(
        jsContent.includes("react"),
        "JS file should include react package"
      );
    },
  });
});

test("Support importmap.json when both exist", async () => {
  await run({
    files: new Map([
      [
        "importmap.json",
        JSON.stringify({
          imports: {
            jquery:
              "https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js",
          },
        }),
      ],
      ["importmap.js", `should not be loaded`],
    ]),
    commands: ["jspm link react -m importmap.json"],
    validationFn: async (files: Map<string, string>) => {
      // Both files should still exist
      assert(files.has("importmap.json"), "importmap.json should exist");
      assert(files.has("importmap.js"), "importmap.js should still exist");

      // importmap.js should not be modified
      const jsContent = files.get("importmap.js")!;
      assert(jsContent === "should not be loaded");

      // importmap.json should be updated with the new package
      const map = JSON.parse(files.get("importmap.json")!);
      assert(map.imports.jquery, "jquery should be preserved in importmap.js");
      assert(map.imports.react, "jquery should be preserved in importmap.js");
    },
  });
});
