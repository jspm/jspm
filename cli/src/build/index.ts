import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { type RollupOptions, rollup } from "rollup";
import c from "picocolors";

import { JspmError, exists } from "../utils.ts";
import type { BuildFlags } from "../cli.ts";
import { initProject } from "../init.ts";
import { RollupImportmapPlugin } from "./rollup-importmap-plugin.ts";

export default async function build(entry: string, options: BuildFlags) {
  // Try to validate the project configuration
  try {
    const projectConfig = await initProject({
      quiet: options.quiet,
      dir: process.cwd(),
    });

    if (!options.quiet) {
      console.log(
        `${c.blue("Info:")} Building project: ${c.bold(projectConfig.name)}`
      );
      if (projectConfig.version) {
        console.log(
          `${c.blue("Info:")} Version: ${c.bold(projectConfig.version)}`
        );
      }
    }

    // If no entry is provided, try to use the main entry from package.json
    if (
      !entry &&
      !options.config &&
      (projectConfig.main || projectConfig.exports)
    ) {
      if (projectConfig.main) {
        const mainEntry = projectConfig.main;

        if (!options.quiet) {
          console.log(
            `${c.blue(
              "Info:"
            )} Using main entry point from package.json: ${c.bold(mainEntry)}`
          );
        }

        // Check if the main entry exists
        const mainPath = path.join(process.cwd(), mainEntry);
        if (await exists(mainPath)) {
          entry = mainEntry;
        } else {
          console.warn(
            `${c.yellow("Warning:")} Main entry point ${c.bold(
              mainEntry
            )} not found.`
          );
        }
      } else if (
        projectConfig.exports &&
        typeof projectConfig.exports === "object"
      ) {
        // Try to find a suitable entry point from exports
        const exportKeys = Object.keys(projectConfig.exports);

        // Priority: "." or "./index.js" or first export
        const mainExport = exportKeys.includes(".")
          ? "."
          : exportKeys.includes("./index.js")
          ? "./index.js"
          : exportKeys[0];

        if (mainExport) {
          const exportValue = projectConfig.exports[mainExport];
          const exportPath =
            typeof exportValue === "string" ? exportValue : null;

          if (exportPath && !options.quiet) {
            console.log(
              `${c.blue("Info:")} Using export ${c.bold(
                mainExport
              )} as entry point: ${c.bold(exportPath)}`
            );
          }

          if (exportPath) {
            const entryPath = path.join(process.cwd(), exportPath);
            if (await exists(entryPath)) {
              entry = exportPath;
            } else {
              console.warn(
                `${c.yellow("Warning:")} Export path ${c.bold(
                  exportPath
                )} not found.`
              );
            }
          }
        }
      }
    }
  } catch (e) {
    // Just log warnings for project validation issues but continue with the build
    if (e instanceof JspmError && !options.quiet) {
      console.warn(`${c.yellow("Warning:")} ${e.message}`);
    }
  }

  if (!entry && !options.config) {
    throw new JspmError(
      `Please provide an entry point for the build or a Rollup config file.`
    );
  }

  let buildConfig: RollupOptions;
  let outputOptions: RollupOptions["output"];

  if (entry) {
    if (!options.output) {
      throw new JspmError(`Build output is required when entry is provided`);
    }

    const entryPath = path.join(process.cwd(), entry);
    if ((await exists(entryPath)) === false) {
      throw new JspmError(`Entry file does not exist: ${entryPath}`);
    }
    buildConfig = {
      input: pathToFileURL(entryPath).href,
      plugins: [RollupImportmapPlugin(options)],
    };

    outputOptions = {
      dir: path.join(process.cwd(), options.output),
    };
  }

  if (options.config) {
    const buildConfigPath = path.join(process.cwd(), options.config);
    if ((await exists(buildConfigPath)) === false) {
      throw new JspmError(
        `Build config file does not exist: ${buildConfigPath}`
      );
    }
    const rollupConfig = await import(pathToFileURL(buildConfigPath).href)
      .then((mod) => mod.default)
      .catch((err) => {
        throw new JspmError(`Failed to load build config: ${err}`);
      });

    if ("output" in rollupConfig) {
      outputOptions = rollupConfig.output;
    }

    buildConfig = {
      ...rollupConfig,
      plugins: [
        ...(rollupConfig?.plugins || []),
        RollupImportmapPlugin(options),
      ],
    };
  }

  const builder = await rollup(buildConfig);
  await builder.write({ format: "esm", ...outputOptions });
}
