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

import { getPackageConfig, lookup } from "@jspm/generator";
import c from "picocolors";
import { JspmError, startSpinner, stopSpinner } from "./utils.ts";
import { withType } from "./logger.ts";
import type { LsFlags } from "./cli.ts";

export default async function ls(packageSpec: string, flags: LsFlags) {
  const log = withType("ls/ls");
  log(`Listing package exports for: ${packageSpec}`);

  if (!packageSpec) {
    throw new JspmError(
      "Please provide a package name. Format: pkgname or pkgname@version"
    );
  }

  try {
    !flags.silent &&
      startSpinner(`Looking up package ${c.bold(packageSpec)}...`);

    // First, look up the package to get the exact resolved version
    const lookupResult = await lookup(packageSpec);

    if (!lookupResult || !lookupResult.resolved) {
      stopSpinner();
      throw new JspmError(`Package "${packageSpec}" not found`);
    }

    const resolvedPackage = lookupResult.resolved;
    log(`Resolved package: ${JSON.stringify(resolvedPackage)}`);

    // Get package configuration using the resolved package info
    const pjson = await getPackageConfig(resolvedPackage);
    stopSpinner();

    if (!pjson) {
      throw new JspmError(
        `Package "${packageSpec}" found but failed to fetch its configuration`
      );
    }

    // Check if exports field exists
    if (!pjson.exports) {
      !flags.silent &&
        console.log(
          `Package "${resolvedPackage.name}@${resolvedPackage.version}" has no exports defined.`
        );
      return;
    }

    // Format the resolved package for display
    const resolvedPackageDisplay = `${c.bold(resolvedPackage.name)}@${c.bold(
      resolvedPackage.version
    )}`;

    // Print the exports with two newlines at the start and end
    !flags.silent && console.log(`\nExports for ${resolvedPackageDisplay}:\n`);

    // Format and display each export, applying filter if provided
    const exportEntries = Object.entries(pjson.exports);
    let displayedEntries = 0;

    for (const [subpath, target] of exportEntries) {
      // Apply filter if provided
      if (
        flags.filter &&
        !subpath.toLowerCase().includes(flags.filter.toLowerCase())
      ) {
        continue;
      }

      const formattedSubpath = c.green(subpath);
      const formattedTarget = c.cyan(JSON.stringify(target, null, 2));

      !flags.silent && console.log(`${formattedSubpath} → ${formattedTarget}`);
      displayedEntries++;
    }

    // Show a message if no entries were displayed after filtering
    if (flags.filter && displayedEntries === 0) {
      !flags.silent &&
        console.log(
          `${c.yellow("No exports match the filter:")} ${flags.filter}`
        );
    } else if (displayedEntries === 0) {
      !flags.silent &&
        console.log(
          `${c.yellow(
            "Note:"
          )} Package has exports defined but they are not in the expected format.`
        );
    }

    // Add an extra newline at the end
    !flags.silent && console.log("");
  } catch (error) {
    stopSpinner();
    if (error instanceof JspmError) {
      throw error;
    }
    throw new JspmError(`Failed to list package exports: ${error.message}`);
  }
}
