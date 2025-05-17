import c from "picocolors";
import type { GenerateOutputFlags } from "./cli.ts";
import {
  JspmError,
  getEnv,
  getGenerator,
  getInputMap,
  startSpinner,
  stopSpinner,
  writeOutput,
} from "./utils.ts";
import { withType } from "./logger.ts";
import { initProject } from "./init.ts";

export default async function update(
  packages: string[],
  flags: GenerateOutputFlags
) {
  const log = withType("update/update");

  log(`Updating packages: ${packages.join(", ")}`);
  log(`Flags: ${JSON.stringify(flags)}`);

  const env = await getEnv(flags);
  const generator = await getGenerator(flags);

  // Read in any import maps or inline modules in the input:
  let inputPins: string[] = [];
  const input = await getInputMap(flags);
  if (typeof input !== "undefined") {
    inputPins = await generator.addMappings(input);
  }

  log(`Input map parsed: ${input}`);

  if (packages.length === 0 && inputPins.length === 0) {
    !flags.quiet &&
      console.warn(
        `${c.red(
          "Warning:"
        )} Nothing to update. Please provide a list of packages or a non-empty input file.`
      );

    // Validate project to provide helpful feedback
    try {
      const projectConfig = await initProject({
        quiet: flags.quiet,
        dir: process.cwd(),
      });

      !flags.quiet &&
        console.log(
          `${c.blue("Info:")} Current project: ${c.bold(projectConfig.name)}`
        );

      if (projectConfig.version) {
        !flags.quiet &&
          console.log(
            `${c.blue("Info:")} Project version: ${c.bold(
              projectConfig.version
            )}`
          );
      }
    } catch (e) {
      // Just for validation, so we can continue
      if (e instanceof JspmError && !flags.quiet) {
        console.warn(`${c.yellow("Warning:")} ${e.message}`);
      }
    }

    return;
  } else {
    // Validate the project before updating
    try {
      const projectConfig = await initProject({
        quiet: flags.quiet,
        dir: process.cwd(),
      });
      log(`Project validated: ${projectConfig.name}`);
    } catch (e) {
      // Just log warnings for project validation issues but continue with update
      if (e instanceof JspmError && !flags.quiet) {
        console.warn(`${c.yellow("Warning:")} ${e.message}`);
      }
    }

    !flags.quiet &&
      startSpinner(
        `Updating ${c.bold(
          packages.length ? packages.join(", ") : "everything"
        )}. (${env.join(", ")})`
      );
    await generator.update(packages.length ? packages : undefined);
    stopSpinner();
  }

  return await writeOutput(generator, null, env, flags, flags.quiet);
}
