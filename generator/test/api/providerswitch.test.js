import { Generator } from "@jspm/generator";
import assert from "assert";

const generator = new Generator({
  mapUrl: import.meta.url,
  defaultProvider: "jspm.io",
  inputMap: {
    imports: {
      react: "https://cdn.skypack.dev/react@18.2.0/index.js",
    },
  },
});

// The generator should swap the provider from skypack to jspm.io.
// TODO: once we land defaultProvider changes this test will break
await generator.install();

const json = generator.getMap();
assert(json.imports.react.startsWith("https://ga.jspm.io/npm:"));
