import { Generator } from "@jspm/generator";
import assert from "assert";

const generator = new Generator({
  inputMap: {
    imports: {
      lit: "https://ga.jspm.io/npm:lit@2.2.4/index.js",
      "lit/directive.js": "https://ga.jspm.io/npm:lit@2.2.4/directive.js",
    },
    scopes: {
      "https://ga.jspm.io/": {
        "@lit/reactive-element":
          "https://ga.jspm.io/npm:@lit/reactive-element@1.3.4/reactive-element.js",
        "lit-element/lit-element.js":
          "https://ga.jspm.io/npm:lit-element@3.2.2/lit-element.js",
        "lit-html": "https://ga.jspm.io/npm:lit-html@2.2.7/lit-html.js",
        "lit-html/directive.js":
          "https://ga.jspm.io/npm:lit-html@2.2.7/directive.js",
      },
    },
  },
  mapUrl: import.meta.url,
  defaultProvider: "jspm.io",
  env: ["production", "browser"],
});

await generator.install("lit@2.3/html.js");
const json = generator.getMap();

assert.strictEqual(
  json.imports.lit,
  "https://ga.jspm.io/npm:lit@2.3.1/index.js"
);
