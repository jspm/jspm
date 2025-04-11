import { Generator } from "@jspm/generator";
import assert from "assert";

// Not supported in browsers
if (typeof document === "undefined") {
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: "jspm.io",
    env: ["production", "browser"],
    commonJS: true,
  });

  await generator.install({ target: "./local/pkg", subpath: "./cjs" });
  const json = generator.getMap();

  assert.strictEqual(json.imports["localpkg/cjs"], "./local/pkg/e.cjs");
  assert.strictEqual(
    json.scopes["./local/pkg/"]["#cjsdep"],
    "./local/pkg/f.cjs"
  );

  const meta = generator.getAnalysis(
    new URL("./local/pkg/f.cjs", import.meta.url)
  );
  assert.deepStrictEqual(meta.cjsLazyDeps, ["./a.js"]);
}
