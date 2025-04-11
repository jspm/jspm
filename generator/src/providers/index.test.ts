import { getDefaultProviderStrings } from "@jspm/generator/providers/index.js";
import assert from "assert";

let ps: string[] = getDefaultProviderStrings();
assert.ok(ps.includes("jspm.io"));
assert.ok(ps.includes("jspm.io#system"));
assert.ok(ps.includes("esm.sh"));
