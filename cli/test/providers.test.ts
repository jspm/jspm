import { test } from "node:test";
import assert from "assert";
import { availableProviders } from "../src/utils.ts";
import { mapDirectory, mapFile, run } from "./scenarios.ts";

test("Swapping providers with a reinstall", async () => {
  // Scenario that checks we can swap providers with a reinstall:
  await run({
    files: await mapDirectory("fixtures/scenario_provider_swap"),
    commands: [`jspm install --provider nodemodules`],
    validationFn: async (files) => {
      const map = files.get("importmap.json");
      assert(!!map);
      assert(!map.includes("jspm.io"));
    },
  });
});

test("Provider auto-detection from initial map", async () => {
  // Scenario that checks the provider is auto-detected from the initial map:
  await run({
    files: await mapFile("fixtures/unpkg.importmap.json"),
    commands: [`jspm link -m unpkg.importmap.json -o importmap.json`],
    validationFn: async (files) => {
      const map = files.get("importmap.json");
      assert(!!map);
      assert(!map.includes("jspm.io"));
    },
  });
});

// Scenarios that check we can use each available provider:
for (const provider of availableProviders) {
  if (provider === "esm.sh") {
    /*
      Disabling esm.sh provider for now. There is a bug for installing lit.
      https://github.com/jspm/generator/issues/335
    */
    continue;
  }

  test(`Using provider: ${provider}`, async () => {
    let spec = "lit";
    let name = "lit";
    // TODO: Disabled pending JSR support
    // if (provider.includes("deno")) {
    //   // oak is using jsr. We need to add support for jsr registry and imort protocol
    //   // https://github.com/jspm/generator/issues/366
    //   // spec = "denoland:oak/body.ts"; // deno doesn't support npm packages
    //   // name = "oak/body.ts";
    //   spec = "denoland:zod";
    //   name = "zod";
    // }
    if (provider === "node") {
      spec = "@jspm/core/nodelibs/fs"; // node provider is only for polyfills
      name = "@jspm/core/nodelibs/fs";
    }
    if (provider === "nodemodules") {
      spec = "lit"; // must be installed in the fixture
      name = "lit";
    }

    const files = await mapDirectory("fixtures/scenario_providers");
    await run({
      files,
      commands: [`jspm install ${spec} -p ${provider} -e production`],
      validationFn: async (files: Map<string, string>) => {
        const map = JSON.parse(files.get("importmap.json") ?? "{}");
        assert(map?.imports?.[name]);
      },
    });
  });
}
