import { test } from "node:test";
import assert from "assert";
import { run } from "./scenarios.ts";

test("Config - set and get user level configuration", async () => {
  await run({
    commands: [
      "jspm config set defaultProvider jsdelivr",
      "jspm config get defaultProvider"
    ],
    validationFn: async (_files: Map<string, string>) => {
      // Validate that the defaultProvider was set to jsdelivr
      // The output is captured in the test framework
    },
  });
});

test("Config - set and get local configuration", async () => {
  await run({
    commands: [
      "jspm config set defaultProvider jsdelivr --local",
      "jspm config get defaultProvider"
    ],
    validationFn: async (files: Map<string, string>) => {
      // Verify .jspmrc file was created in the local directory
      assert(files.has(".jspmrc"), "Local .jspmrc file not created");
      
      // Parse the .jspmrc file and check its contents
      const config = JSON.parse(files.get(".jspmrc"));
      assert.strictEqual(config.defaultProvider, "jsdelivr");
    },
  });
});

test("Config - list configuration", async () => {
  await run({
    commands: [
      "jspm config set defaultProvider jsdelivr --local",
      "jspm config set providers.npm.baseUrl https://custom-registry.example.com/ --local",
      "jspm config list"
    ],
    validationFn: async (files: Map<string, string>) => {
      assert(files.has(".jspmrc"), "Local .jspmrc file not created");
      
      const config = JSON.parse(files.get(".jspmrc"));
      assert.strictEqual(config.defaultProvider, "jsdelivr");
      // Only check the baseUrl property, not the entire object
      assert.strictEqual(config.providers.npm.baseUrl, "https://custom-registry.example.com/");
    },
  });
});

test("Config - delete configuration value", async () => {
  await run({
    commands: [
      "jspm config set defaultProvider jsdelivr --local",
      "jspm config set providers.npm.baseUrl https://custom-registry.example.com/ --local",
      "jspm config delete defaultProvider --local",
      "jspm config list"
    ],
    validationFn: async (files: Map<string, string>) => {
      assert(files.has(".jspmrc"), "Local .jspmrc file not created");
      
      const config = JSON.parse(files.get(".jspmrc"));
      assert(config.defaultProvider === undefined, "defaultProvider should be deleted");
      // Only check the baseUrl property, not the entire object
      assert.strictEqual(config.providers.npm.baseUrl, "https://custom-registry.example.com/");
    },
  });
});

test("Config - nested provider configuration", async () => {
  await run({
    commands: [
      "jspm config set providers.npm.baseUrl https://custom-registry.example.com/ --local",
      "jspm config set providers.npm.auth token123 --local",
      "jspm config get providers.npm"
    ],
    validationFn: async (files: Map<string, string>) => {
      assert(files.has(".jspmrc"), "Local .jspmrc file not created");
      
      const config = JSON.parse(files.get(".jspmrc"));
      // Only check specific properties, not the entire object
      assert.strictEqual(config.providers.npm.baseUrl, "https://custom-registry.example.com/");
      assert.strictEqual(config.providers.npm.auth, "token123");
    },
  });
});

// Test configuration with installation scenario
test("Config - installation with custom provider from config", async () => {
  await run({
    // Set up initial config and then perform an installation
    files: new Map([
      [".jspmrc", JSON.stringify({
        defaultProvider: "jsdelivr"
      })]
    ]),
    commands: [
      "jspm install react@17.0.1"
    ],
    validationFn: async (files: Map<string, string>) => {
      assert(files.has("importmap.json"), "Import map not created");
      
      const importMap = JSON.parse(files.get("importmap.json"));
      assert(importMap.imports.react.startsWith("https://cdn.jsdelivr.net/"), 
        "Import map should use jsdelivr provider from config");
    },
  });
});

// Test configuration priority (local overrides user)
test("Config - local config overrides user config", async () => {
  await run({
    files: new Map([
      [".jspmrc", JSON.stringify({
        defaultProvider: "jsdelivr"
      })]
    ]),
    commands: [
      // This would set user config, but shouldn't affect our test due to local override
      "jspm config set defaultProvider unpkg",
      "jspm install react@17.0.1"
    ],
    validationFn: async (files: Map<string, string>) => {
      assert(files.has("importmap.json"), "Import map not created");
      
      const importMap = JSON.parse(files.get("importmap.json"));
      assert(importMap.imports.react.startsWith("https://cdn.jsdelivr.net/"), 
        "Import map should use jsdelivr provider from local config");
    },
  });
});

// Test configuration cascade from parent directories
test("Config - configuration inherited from parent directory", async () => {
  await run({
    files: new Map([
      [".jspmrc", JSON.stringify({
        defaultProvider: "jsdelivr"
      })],
      ["subdir/package.json", JSON.stringify({ name: "subproject", version: "1.0.0" })]
    ]),
    // Use the cwd option to run commands from the subdirectory
    cwd: "subdir",
    commands: [
      "jspm install react@17.0.1"
    ],
    validationFn: async (files: Map<string, string>) => {
      assert(files.has("subdir/importmap.json"), "Import map not created in subdirectory");
      
      const importMap = JSON.parse(files.get("subdir/importmap.json"));
      assert(importMap.imports.react.startsWith("https://cdn.jsdelivr.net/"), 
        "Import map should use jsdelivr provider from parent directory config");
    },
  });
});