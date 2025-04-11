import { Generator } from "@jspm/generator";
import assert from "assert";

const generator = new Generator({
  mapUrl: new URL("./local/pkg/asdf", import.meta.url),
  defaultProvider: "jspm.io",
  env: ["production", "browser"],
});

await generator.link("localpkg/jquery");
const json = generator.getMap();

assert.ok(json.imports["localpkg/jquery"]);
assert.ok(json.scopes["./"].jquery.includes("@2"));
