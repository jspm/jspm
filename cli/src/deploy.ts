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

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import c from "picocolors";
import open from "open";
import {
  JspmError,
  copyToClipboard,
  exists,
  getEnv,
  getFilesRecursively,
  getGenerator,
  parsePackageSpec,
  runPackageScript,
  startSpinner,
  stopSpinner,
  writeOutput,
} from "./utils.ts";
import type { DeployFlags, EjectFlags } from "./cli.ts";
import { withType } from "./logger.ts";
import { loadConfig } from "./config.ts";

async function readJsonFile(filePath: string, defaultValue: any = {}) {
  try {
    if (exists(filePath)) {
      const content = await fs.readFile(filePath, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    throw new JspmError(
      `Unable to read package.json file ${filePath} - ${err.message}`
    );
  }
  return defaultValue;
}

export async function eject(pkg: string, flags: EjectFlags = {}) {
  if (!flags.dir) {
    throw new JspmError(
      `A --dir ejection flag for the output directory must be provided`
    );
  }

  const log = withType("eject");

  if (!pkg.startsWith("app:")) {
    throw new JspmError(
      `Only the app: JSPM deployment registry is currently supported for ejection.`
    );
  }

  const config = await loadConfig();
  log(
    `Loaded config with ${
      config.providers ? Object.keys(config.providers).length : 0
    } provider configurations`
  );

  const provider = config.deployProvider || "jspm.io";

  const generator = await getGenerator(flags);

  const name = parsePackageSpec(pkg.slice(4));
  const version = pkg.slice(4 + name.length + 1);

  startSpinner(`Ejecting ${c.bold(pkg)}...`);
  await generator.eject({ name, version, provider }, flags.dir);
  stopSpinner();

  startSpinner(`Merging deployment import map for ${c.bold(pkg)}...`);
  const env = await getEnv(flags);
  await writeOutput(generator, null, env, flags, flags.silent);
  stopSpinner();

  console.log(
    `${c.green("Ok:")} Package ${c.green(pkg)} ejected into ${c.bold(
      flags.dir
    )}`
  );
}

export async function publish(
  dir: string | undefined,
  flags: DeployFlags = {}
) {
  const directory = dir || process.cwd();

  const jspmConfigPath = path.join(directory, "jspm.json");
  const jspmConfig = await readJsonFile(jspmConfigPath);

  const ignore = jspmConfig.ignore || [];
  const include = jspmConfig.include || [];

  const packageJsonPath = path.join(directory, "package.json");
  const packageJson = await readJsonFile(packageJsonPath);

  if (packageJson.jspm) {
    const { jspm } = packageJson;
    delete packageJson.jspm;
    Object.assign(packageJson, jspm);
  }

  const prepareScript = packageJson.scripts?.prepare;
  const name = flags.name || packageJson.name;
  const version = String(flags.version || packageJson.version);
  const semverVersion = version.match(/^\d+\.\d+\.\d+(\-[a-zA-Z0-9_\-\.]+)?$/);

  if (flags.watch) {
    if (semverVersion || !version.match(/^[a-zA-Z0-9_\-]+$/)) {
      throw new JspmError(
        `Invalid version "${version}" for deploy --watch. Watched deployments must be to mutable versions, which are alphanumeric only with - or _ separators.`
      );
    }
    return startWatchMode(
      name,
      version,
      directory,
      ignore,
      include,
      flags,
      prepareScript
    );
  }

  return deployOnce(
    name,
    version,
    directory,
    flags,
    flags.usage ?? true,
    prepareScript
  );
}

async function deployOnce(
  name: string,
  version: string,
  directory: string,
  flags: DeployFlags,
  logSnippet: boolean,
  prepareScript: string
) {
  const log = withType("deploy");

  const config = await loadConfig();
  log(
    `Loaded config with ${
      config.providers ? Object.keys(config.providers).length : 0
    } provider configurations`
  );

  const deployProvider = config.deployProvider || "jspm.io";

  if (prepareScript) {
    console.log(`${c.blue("Info:")} Running ${c.bold("prepare")} script...`);
    await runPackageScript(prepareScript, directory);
    console.log(`${c.blue("Info:")} ${c.bold("prepare")} script completed`);
  }

  startSpinner(
    `Deploying ${c.bold(`${name}@${version}`)} to ${deployProvider}...`
  );

  const generator = await getGenerator(flags, {
    mapUrl: pathToFileURL(`${directory}/`),
  });

  try {
    const { packageUrl, mapUrl, codeSnippet } = await generator.deploy({
      package: pathToFileURL(directory).href,
      name,
      version,
      provider: deployProvider,
      importMap: true,
      install: true,
    });

    stopSpinner();

    console.log(
      `${c.green("Ok:")} Package deployed to ${c.green(
        packageUrl
      )} with import map ${c.green(mapUrl)}`
    );

    if (codeSnippet && logSnippet) {
      console.log(
        `\n${c.magentaBright(c.bold("HTML Usage:"))}\n\n${c.greenBright(
          codeSnippet
            .split("\n")
            .map((l) => {
              if (l.startsWith("<!--") && l.endsWith("-->"))
                return `  ${c.gray(l)}`;
              if (l.startsWith("//")) return `  ${c.gray(l)}`;
              l = l
                .replace(/("[^"]*")/g, (s) => c.red(s))
                .replace(/\>?\<\/?script\>?/g, (s) => c.blue(s));
              return `  ${l}`;
            })
            .join("\n")
        )}`
      );
    }

    return { packageUrl, mapUrl, codeSnippet };
  } catch (error) {
    stopSpinner();
    throw new JspmError(`Failed to deploy: ${error.message}`);
  }
}

async function startWatchMode(
  name: string,
  version: string,
  directory: string,
  ignore: string[],
  include: string[],
  flags: DeployFlags,
  prepareScript: string
) {
  let lastDeployTime = 0;
  const fileMTimes = new Map<string, number>();

  let packageUrl, mapUrl, codeSnippet;
  let forcedRedeploy = false;
  let lastRunWasError = false;
  let waiting = false;

  await watchLoop(true);

  const initialFileList = await getFilesRecursively(directory, ignore, include);
  for (const filePath of initialFileList) {
    try {
      const stats = await fs.stat(filePath);
      fileMTimes.set(filePath, stats.mtimeMs);
    } catch (err) {}
  }

  const intervalId = setInterval(watchLoop, 1000);

  function stopWatch() {
    clearInterval(intervalId);
    stopSpinner();
    if (waiting && !lastRunWasError) {
      console.log(`${"\x1b[1A\x1b[2K".repeat(9)}\x1b[1A\x1b[2K\x1b[1A`);
    }
    console.log(`\n${c.blue("Info:")} Watch mode stopped`);
    process.exit(0);
  }

  process.on("SIGINT", stopWatch);

  process.stdin.on("data", (key) => {
    switch (String(key)) {
      case "\u0003":
      case "q":
        stopWatch();
        break;
      case "p":
        if (packageUrl) open(packageUrl);
        break;
      case "i":
        if (mapUrl) open(mapUrl);
        break;
      case "r":
        forcedRedeploy = true;
        break;
      case "c":
        if (codeSnippet) copyToClipboard(codeSnippet);
        break;
      case "o":
        if (codeSnippet)
          open(
            `data:text/html;base64,${Buffer.from(
              `<!doctype html>\n<body></body>\n${codeSnippet
                .split("\n")
                .filter((l) => !l.startsWith("<!--") || !l.endsWith("-->"))
                .join("\n")
                .replace(".js", ".hot.js")}`
            ).toString("base64")}`,
            { app: { name: "chrome" } }
          );
    }
  });

  async function watchLoop(firstRun) {
    try {
      // Skip if last deployment was less than 2 seconds ago (debounce)
      if (Date.now() - lastDeployTime < 2000) {
        return;
      }

      const changes: string[] = [];
      const currentFileList = await getFilesRecursively(
        directory,
        ignore,
        include
      );

      // Check for new or modified files
      for (const filePath of currentFileList) {
        try {
          const stats = await fs.stat(filePath);
          const oldMTime = fileMTimes.get(filePath) || 0;

          if (stats.mtimeMs > oldMTime) {
            changes.push(filePath);
            fileMTimes.set(filePath, stats.mtimeMs);
          }
        } catch (err) {
          // Ignore errors for missing files
        }
      }

      // Check for deleted files
      for (const [filePath] of fileMTimes) {
        if (!currentFileList.includes(filePath)) {
          changes.push(filePath);
          fileMTimes.delete(filePath);
        }
      }

      if (changes.length || forcedRedeploy) {
        waiting = false;
        if (!firstRun) {
          if (lastRunWasError) stopSpinner();
          else
            console.log(`${"\x1b[1A\x1b[2K".repeat(8)}\x1b[1A\x1b[2K\x1b[1A`);
          console.log(
            `${c.blue("Info:")} ${
              forcedRedeploy
                ? "Requesting redeploy"
                : changes.length > 1
                ? "Multiple changes detected"
                : `${path.relative(directory, changes[0])} changed`
            }, redeploying...`
          );
        }
        forcedRedeploy = false;
        ({ packageUrl, mapUrl, codeSnippet } = await deployOnce(
          name,
          version,
          directory,
          flags,
          (flags.usage ?? true) && firstRun,
          prepareScript
        ));

        lastDeployTime = Date.now();
        console.log(
          `${c.blue("Info:")} Watching for changes in ${c.cyan(directory)}...`
        );
        console.log(`${c.magenta(c.bold("\nKeyboard shortcuts:"))}
 → ${c.bold(c.bgBlueBright(c.whiteBright(" o ")))} ${c.dim(
          "Open preview URL in the browser"
        )}
 → ${c.bold(c.bgBlueBright(c.whiteBright(" c ")))} ${c.dim(
          "Copy HTML usage script code snippet to clipboard"
        )}
 → ${c.bold(c.bgBlueBright(c.whiteBright(" p ")))} ${c.dim(
          "Open package URL in the browser"
        )}
 → ${c.bold(c.bgBlueBright(c.whiteBright(" i ")))} ${c.dim(
          "Open package import map in the browser"
        )}
 → ${c.bold(c.bgBlueBright(c.whiteBright(" r ")))} ${c.dim(
          "Force redeployment"
        )}
 → ${c.bold(c.bgBlueBright(c.whiteBright(" q ")))} ${c.dim(
          "Stop (or Ctrl+C)"
        )}`);

        process.stdin.setRawMode?.(true);
        process.stdin.resume();
        lastRunWasError = false;
        waiting = true;
      }
    } catch (error) {
      lastRunWasError = true;
      process.stdin.setRawMode?.(false);
      console.error(`${c.red("Error:")} Watch mode error`);
      console.error(error);
      startSpinner("Waiting for update to fix the error...");
      waiting = true;
    }
  }
}
