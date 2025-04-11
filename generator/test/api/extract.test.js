import { Generator } from "@jspm/generator";
import assert from "assert";

const generator = new Generator({
  inputMap: {
    imports: {
      react: "https://ga.jspm.io/npm:react@17.0.1/dev.index.js",
      "react-dom": "https://ga.jspm.io/npm:react-dom@17.0.1/dev.index.js",
    },
    scopes: {
      "https://ga.jspm.io/": {
        "object-assign": "https://ga.jspm.io/npm:object-assign@4.1.0/index.js",
        scheduler: "https://ga.jspm.io/npm:scheduler@0.20.1/dev.index.js",
        "scheduler/tracing":
          "https://ga.jspm.io/npm:scheduler@0.20.1/dev.tracing.js",
      },
    },
  },
  mapUrl: import.meta.url,
  defaultProvider: "jspm.io",
  env: ["production", "browser"],
  freeze: true,
});

const { map } = await generator.extractMap("react");

assert.strictEqual(
  map.imports.react,
  "https://ga.jspm.io/npm:react@17.0.1/index.js"
);
assert.strictEqual(
  map.scopes["https://ga.jspm.io/"]["object-assign"],
  "https://ga.jspm.io/npm:object-assign@4.1.0/index.js"
);
assert.strictEqual(Object.keys(map.imports).length, 1);
assert.strictEqual(Object.keys(map.scopes["https://ga.jspm.io/"]).length, 1);
