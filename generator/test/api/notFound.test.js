import { Generator } from "@jspm/generator";
import assert from "assert";

const BASE_CONFIG = {
  mapUrl: "about:blank",
  ignore: [
    "react",
    "react/jsx-runtime",
    "react-dom",
    "react-dom/server",
    "framer",
    "framer-motion",
    "framer-motion/three",
  ],
  env: ["production", "browser", "module"],
};

const generator = new Generator({
  ...BASE_CONFIG,
});

try {
  await generator.install("react@24");
  assert.fail("react@24 is released");
} catch (e) {
  assert.strictEqual(
    e.message,
    "Unable to resolve npm:react@24 to a valid version imported from about:blank/"
  );
}
