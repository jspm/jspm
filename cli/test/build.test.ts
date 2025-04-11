import { test } from "node:test";
import assert from "assert";
import { mapDirectory, run } from "./scenarios.ts";

// Windows tests are disabled
test("build with rollup config", { skip: process.platform === 'win32' }, async () => {
  const filesOwnName = await mapDirectory("test/fixtures/scenario_build_app");

  await run({
    files: filesOwnName,
    commands: ["jspm build --config rollup-config.mjs"],
    validationFn: async (files) => {
      const build = files.get("build.js");
      assert(!!build);
      assert(!build.includes('import { add } from "./utils.js"'));
      assert(build.includes("const add = (num1, num2) => num1 + num2"));
    },
  });
});