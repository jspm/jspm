import { test } from "node:test";
import assert from "assert";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { run } from "./scenarios.ts";

// Get current file directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to load fixture files
async function loadFixtures(fixtureDir: string): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  const basePath = path.join(__dirname, "fixtures", fixtureDir);

  async function processDirectory(dir: string, prefix = "") {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      const relativePath = path.join(prefix, entry.name);

      if (entry.isDirectory()) {
        await processDirectory(entryPath, relativePath);
      } else {
        const content = await fs.readFile(entryPath, "utf8");
        files.set(relativePath.replace(/\\/g, "/"), content);
      }
    }
  }

  await processDirectory(basePath);
  return files;
}

test("Real-world - loading configuration from fixtures", async () => {
  const fixtureFiles = await loadFixtures("scenario_config");

  await run({
    files: fixtureFiles,
    commands: ["jspm config list"],
    validationFn: async (files: Map<string, string>) => {
      // Verify that .jspmrc was loaded correctly
      assert(files.has(".jspmrc"), "Config file should exist");

      const config = JSON.parse(files.get(".jspmrc")!);
      assert.strictEqual(config.defaultProvider, "jsdelivr");
      // Only check specific properties, not the entire object
      assert.strictEqual(
        config.providers.npm.baseUrl,
        "https://registry.example.com/"
      );
    },
  });
});

test("Real-world - config merging between parent and child directories", async () => {
  const fixtureFiles = await loadFixtures("scenario_config");

  await run({
    files: fixtureFiles,
    // Use the nested subdirectory as the working directory
    cwd: "nested",
    commands: ["jspm config list"],
    validationFn: async (files: Map<string, string>) => {
      // Check if both configs are present
      assert(files.has(".jspmrc"), "Parent config file should exist");
      assert(files.has("nested/.jspmrc"), "Nested config file should exist");

      // Check if nested directory has merged config values from parent
      const nestedConfig = JSON.parse(files.get("nested/.jspmrc")!);

      // The nested config should have auth token
      assert.strictEqual(nestedConfig.providers.npm.auth, "token123");
    },
  });
});

test("Real-world - local config updates", async () => {
  const fixtureFiles = await loadFixtures("scenario_config");

  await run({
    files: fixtureFiles,
    commands: [
      // Use the --local flag to update the local config file directly
      "jspm config set defaultProvider unpkg --local",
      "jspm config set providers.npm.baseUrl https://isolated-registry.example.com/ --local",
      "jspm config list",
    ],
    validationFn: async (files: Map<string, string>) => {
      // Check if the local config file was updated correctly
      assert(files.has(".jspmrc"), "Local config file should exist");

      const localConfig = JSON.parse(files.get(".jspmrc")!);

      // Verify the local config has been updated with the new values
      assert.strictEqual(localConfig.defaultProvider, "unpkg");
      assert.strictEqual(
        localConfig.providers.npm.baseUrl,
        "https://isolated-registry.example.com/"
      );
    },
  });
});

test("Real-world - config value overrides", async () => {
  const fixtureFiles = await loadFixtures("scenario_config");

  await run({
    files: fixtureFiles,
    commands: [
      // Override the default provider in .jspmrc
      "jspm config set defaultProvider unpkg --local",
      "jspm link lodash -o importmap.json",
    ],
    validationFn: async (files: Map<string, string>) => {
      assert(files.has("importmap.json"), "Import map should exist");

      const importMap = JSON.parse(files.get("importmap.json")!);
      const config = JSON.parse(files.get(".jspmrc")!);

      // Config should be updated
      assert.strictEqual(config.defaultProvider, "unpkg");

      // Importmap should use unpkg not jsdelivr
      assert(
        importMap.imports.lodash.startsWith("https://unpkg.com/"),
        "Import map should use unpkg provider from updated config"
      );
    },
  });
});
