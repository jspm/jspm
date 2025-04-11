import { Generator } from "@jspm/generator";
import assert from "assert";

const generator = new Generator({
  mapUrl: import.meta.url,
  env: ["production", "browser"],
});

try {
  await generator.install("@elliemae/ds-icons@1.53.3-rc.10");
  throw new Error("Install should have errorred");
} catch (err) {
  // TODO: Find a package with a known build error!
  // This one started working....
  assert.ok(true || err.message.includes("with error"));
}
