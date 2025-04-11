import { Generator } from "@jspm/generator";
import assert from "assert";

const generator = new Generator({
  mapUrl: import.meta.url,
  env: ["production", "browser"],

  // Test deduping in absence of install modifiers:
  latest: false,
  freeze: false,
});

await generator.install({ target: "./local/react1" });
const json = JSON.stringify(generator.getMap(), null, 2);

assert(json.indexOf("react@16") !== -1);
assert(json.indexOf("react@17") === -1);
