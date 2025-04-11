import { getPackageConfig } from "@jspm/generator";
import assert from "assert";

const pcfg = await getPackageConfig("https://ga.jspm.io/npm:jquery@3.6.0/");
assert.strictEqual(pcfg.name, "jquery");
