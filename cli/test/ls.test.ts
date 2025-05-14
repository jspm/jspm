/**
 * Copyright 2022-2025 Guy Bedford
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { getPackageConfig, lookup } from "@jspm/generator";
import ls from "../src/ls.ts";

describe("ls command", () => {
  it("should throw if package name is not provided", async () => {
    try {
      await ls("", { silent: true });
      assert.fail("Should have thrown an error");
    } catch (err) {
      assert.ok(err.message.includes("Please provide a package name"));
    }
  });

  it("should successfully lookup and get exports for a package", async () => {
    // Test with lit which is known to have exports
    const packageName = "lit@2.7.0";
    const originalConsoleLog = console.log;

    // Track console.log calls
    const logCalls: string[] = [];
    console.log = (...args) => {
      logCalls.push(args.join(" "));
    };

    try {
      await ls(packageName, { silent: false });

      // Verify logs contain export information
      const exportsLogged = logCalls.some((log) => log.includes("Exports for"));
      assert.ok(exportsLogged, "Should log exports information");

      // Verify version is displayed
      const versionDisplayed = logCalls.some((log) => log.includes("2.7.0"));
      assert.ok(versionDisplayed, "Should display the resolved version");
    } finally {
      // Restore console.log
      console.log = originalConsoleLog;
    }
  });

  it("should filter exports based on provided filter", async () => {
    // Test package with multiple exports
    const packageName = "lit@2.7.0";
    const originalConsoleLog = console.log;

    // Track console.log calls
    let logCalls: string[] = [];
    console.log = (...args) => {
      logCalls.push(args.join(" "));
    };

    try {
      // Test with filter that should match some exports
      await ls(packageName, { silent: false, filter: "decorators" });

      // Verify only filtered exports are displayed
      const hasFilteredExports = logCalls.some((log) =>
        log.includes("decorators")
      );
      assert.ok(hasFilteredExports, "Should display exports matching filter");

      // Reset log calls for next test
      logCalls = [];

      // Test with filter that shouldn't match any exports
      await ls(packageName, {
        silent: false,
        filter: "nonexistent-pattern-xyz",
      });

      // Verify message about no matching exports
      const noMatchMessage = logCalls.some((log) =>
        log.includes("No exports match the filter")
      );
      assert.ok(
        noMatchMessage,
        "Should show message when no exports match filter"
      );
    } finally {
      // Restore console.log
      console.log = originalConsoleLog;
    }
  });

  it("should look up a package without version and show resolved version", async () => {
    const packageName = "lit"; // No version specified
    const originalConsoleLog = console.log;

    // Track console.log calls
    const logCalls: string[] = [];
    console.log = (...args) => {
      logCalls.push(args.join(" "));
    };

    try {
      await ls(packageName, { silent: false });

      // Verify export information contains a version
      const versionDisplayed = logCalls.some((log) => {
        return log.includes("Exports for") && /\d+\.\d+\.\d+/.test(log);
      });
      assert.ok(
        versionDisplayed,
        "Should display resolved version when version not specified"
      );
    } finally {
      // Restore console.log
      console.log = originalConsoleLog;
    }
  });

  // This test is for providing info to the user about tests that might fail
  it("can directly use the JSPM API to verify functionality", async () => {
    const lookupResult = await lookup("lit@2.7.0");
    assert.ok(lookupResult, "Should get a lookup result");
    assert.ok(lookupResult.resolved, "Should get resolved package info");

    const pjson = await getPackageConfig(lookupResult.resolved);
    assert.ok(pjson, "Should get package config");
    assert.ok(pjson.exports, "Package should have exports");
  });
});
