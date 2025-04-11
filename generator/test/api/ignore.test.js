import { Generator } from "@jspm/generator";
import assert from "assert";

const generator = new Generator({
  mapUrl: import.meta.url,
  inputMap: {
    imports: {
      react: "./location/that/cant/be/traced.js",
    },
  },
  ignore: ["react"],
  env: ["production", "browser", "module"],
});

await generator.install("@react-three/fiber@7.0.15");

const json = generator.getMap();

assert.deepEqual(json.imports, {
  react: "./location/that/cant/be/traced.js",
  "@react-three/fiber":
    "https://ga.jspm.io/npm:@react-three/fiber@7.0.15/dist/react-three-fiber.esm.js",
});
assert(json.scopes["https://ga.jspm.io/"].hasOwnProperty("react") === false);
