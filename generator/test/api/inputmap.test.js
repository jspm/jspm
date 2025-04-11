import { Generator } from "@jspm/generator";
import assert from "assert";

const generator = new Generator({
  mapUrl: import.meta.url,
  inputMap: {
    imports: {
      react: "https://cdn.skypack.dev/react",
    },
  },
  env: ["production", "browser"],
});

await generator.install("react-dom@17");

const json = generator.getMap();

assert.deepEqual(json, {
  imports: {
    react: "https://cdn.skypack.dev/react",
    "react-dom": "https://ga.jspm.io/npm:react-dom@17.0.2/index.js",
  },
  scopes: {
    "https://ga.jspm.io/": {
      "object-assign": "https://ga.jspm.io/npm:object-assign@4.1.1/index.js",
      scheduler: "https://ga.jspm.io/npm:scheduler@0.20.2/index.js",
    },
  },
});
