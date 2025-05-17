import { pathToFileURL } from "node:url";
import c from "picocolors";
import { withType } from "./logger.ts";
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
import type { IImportMap } from "./types.ts";
import { initProject } from "./init.ts";

export default async function install(flags: GenerateOutputFlags): Promise<{
  staticDeps: string[];
  dynamicDeps: string[];
  map: IImportMap | undefined;
} | null> {
  const log = withType("install/install");
  log(`Flags: ${JSON.stringify(flags)}`);

  const env = await getEnv(flags);
  const input = await getInputMap(flags);

  log(`Input map parsed: ${input}`);

  let generator, staticDeps, dynamicDeps;

  // Install the local package with exports
  try {
    // Initialize using the specified package directory or current directory
    const projectConfig = await initProject(flags);

    // Remove all top-level own-name imports as we use the package.json as the authoritiative source
    // for these
    for (const key of Object.keys((input.imports = input.imports || {}))) {
      if (
        key === projectConfig.name ||
        (key.startsWith(projectConfig.name) &&
          key[projectConfig.name.length] === "/")
      ) {
        delete input.imports[key];
      }
    }

    generator = await getGenerator(flags, null, input);

    if (!flags.quiet) startSpinner(`Installing local package.json exports...`);

    const packageUrl = pathToFileURL(`${projectConfig.projectPath}/`).href;
    // Install the local package with subpaths option to trace all exports
    ({ staticDeps, dynamicDeps } = await generator.install(
      {
        alias: projectConfig.name,
        target: `${packageUrl}/`,
        subpaths: true,
      },
      "freeze"
    ));
  } catch (e) {
    if (e instanceof JspmError && !flags.quiet) {
      console.warn(`${c.red("Warning:")} ${e.message}`);
    } else {
      throw e;
    }
    return null;
  } finally {
    stopSpinner();
  }

  generator = generator || (await getGenerator(flags, null, input));

  // Installs always behave additively, and write all top-level pins:
  const map = await writeOutput(generator, null, env, flags, flags.quiet);

  return { staticDeps, dynamicDeps, map };
}
