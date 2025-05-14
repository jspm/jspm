import fs from "node:fs/promises";
import { accessSync, existsSync, unlinkSync, writeFileSync } from "node:fs";
import path, { join } from "node:path";
import { pathToFileURL } from "node:url";
import { platform, tmpdir } from "node:os";
import { execSync, spawn } from "node:child_process";
import { Generator, analyzeHtml } from "@jspm/generator";
import ora from "ora";
import c from "picocolors";
import { minimatch } from "minimatch";
import { withType } from "./logger.ts";
import { loadConfig } from "./config.ts";
import type { IImportMapJspm } from "./types.ts";
import type { GenerateFlags, GenerateOutputFlags } from "./cli.ts";

// Default import map to use if none is provided:
const defaultMapPath = "importmap.json";

export function isJsExtension(ext) {
  return (
    ext === ".js" ||
    ext === ".mjs" ||
    ext === ".cjs" ||
    ext === ".ts" ||
    ext === ".mts" ||
    ext === ".cts" ||
    ext === ".jsx" ||
    ext === ".tsx"
  );
}

// Default HTML for import map injection:
const defaultHtmlTemplate = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>JSPM example</title>
    <script type="importmap"></script>
  </head>
  <body>
  </body>
</html>`;

// Providers that can be used to resolve dependencies:
export const availableProviders = [
  "jspm.io",
  "nodemodules",
  "deno",
  "jsdelivr",
  "skypack",
  "unpkg",
  "esm.sh",
  "jspm.io#system",
];

export class JspmError extends Error {
  jspmError = true;
}

export function cwdUrl() {
  return pathToFileURL(`${process.cwd()}/`);
}

/**
 * Intercepts internal errors in CLI commands:
 */
export function wrapCommand(fn: Function) {
  return async (...args: any[]) => {
    try {
      await fn(...args);
    } catch (e) {
      stopSpinner();
      process.exitCode = 1;
      if (e instanceof JspmError || e?.jspmError) {
        console.error(`${c.red("Error:")} ${e.message}\n`);
        return false;
      }
      throw e;
    }
    return true;
  };
}

export async function writeOutput(
  generator: Generator,
  pins: string[] | null,
  env: string[],
  flags: GenerateOutputFlags,
  silent = false
) {
  if (flags.stdout) return writeStdoutOutput(generator, pins, silent);

  const mapFile = getOutputPath(flags);
  if (mapFile.endsWith(".html"))
    return writeHtmlOutput(mapFile, generator, pins, env, flags, silent);
  return writeJsonOutput(mapFile, generator, pins, env, flags, silent);
}

async function writeStdoutOutput(
  generator: Generator,
  pins: string[] | null,
  silent = false
) {
  let map: IImportMapJspm = pins?.length
    ? (await generator.extractMap(pins))?.map
    : generator.getMap();
  map = { ...map };

  !silent && console.log(JSON.stringify(map, null, 2));
  return map;
}

async function writeHtmlOutput(
  mapFile: string,
  generator: Generator,
  pins: string[] | null,
  env: string[],
  flags: GenerateOutputFlags,
  silent = false
) {
  // Don't write an output file without permission:
  if (!(await canWrite(mapFile)))
    throw new JspmError(
      `JSPM does not have permission to write to ${mapFile}.`
    );

  const mapFileRel = path.relative(process.cwd(), mapFile);
  if (!exists(mapFile)) {
    !silent &&
      console.warn(
        `${c.cyan(
          "Note:"
        )} HTML file ${mapFileRel} does not exist, creating one.`
      );
    await fs.writeFile(mapFile, defaultHtmlTemplate, "utf-8");
  }

  let html: string;
  try {
    html = await fs.readFile(mapFile, "utf-8");
  } catch (e) {
    throw new JspmError(
      `Failed to read HTML file ${c.cyan(mapFile)} for injection.`
    );
  }

  // TODO: Inject env into the import map somehow.
  const outputHtml = await generator.htmlInject(html, {
    pins: pins ?? true,
    htmlUrl: generator.mapUrl, // URL of the output map
    rootUrl: generator.rootUrl,
    preload: getPreloadMode(flags),
    integrity: flags.integrity,
    whitespace: !flags.compact,
    comment: false,
  });

  await fs.writeFile(mapFile, outputHtml);
  !silent && console.warn(`${c.green("Ok:")} Updated ${c.cyan(mapFileRel)}`);
}

async function writeJsonOutput(
  mapFile: string,
  generator: Generator,
  pins: string[] | null,
  env: string[],
  flags: GenerateOutputFlags,
  silent = false
) {
  const log = withType("utils/writeJsonOutput");

  let map: IImportMapJspm;
  if (pins?.length) {
    log(`Extracting map for top-level pins: ${pins?.join(", ")}`);
    map = (await generator.extractMap(pins))?.map;
  } else {
    log(`Extracting full map`);
    map = generator.getMap();
  }
  log(`${JSON.stringify(map, null, 2)}`);

  // Don't write an output file without permission:
  if (!(await canWrite(mapFile)))
    throw new JspmError(
      `JSPM does not have permission to write to ${mapFile}.`
    );

  // If the JSON file already exists, extend it in case of other custom properties
  // (this way we can install into deno.json without destroying configurations)
  try {
    const existing = JSON.parse(await fs.readFile(mapFile, "utf8"));
    delete existing.imports;
    delete existing.scopes;
    delete existing.integrity;
    map = Object.assign({}, existing, map);
  } catch {}

  // Otherwise we output the import map in standard JSON format:
  await fs.writeFile(
    mapFile,
    flags.compact ? JSON.stringify(map) : JSON.stringify(map, null, 2)
  );

  const mapFileRel = path.relative(process.cwd(), mapFile);
  !silent && console.warn(`${c.green("Ok:")} Updated ${c.cyan(mapFileRel)}`);
  return map;
}

export async function getGenerator(
  flags: GenerateFlags & GenerateOutputFlags,
  configOverride: any = null
): Promise<Generator> {
  const log = withType("utils/getGenerator");
  const mapUrl = getOutputMapUrl(flags);
  const rootUrl = getRootUrl(flags);
  const baseUrl = new URL(path.dirname(mapUrl.href));
  log(
    `Creating generator with mapUrl ${mapUrl}, baseUrl ${baseUrl}, rootUrl ${rootUrl}`
  );

  // Load configuration
  const config = await loadConfig();
  log(
    `Loaded config with ${
      config.providers ? Object.keys(config.providers).length : 0
    } provider configurations`
  );

  // CLI flags take precedence over config file
  const defaultProvider = getProvider(flags) || config.defaultProvider;

  return new Generator(
    Object.assign(
      {
        mapUrl,
        baseUrl,
        rootUrl,
        inputMap: await getInputMap(flags),
        env: await getEnv(flags),
        flattenScopes: flags.flattenScopes,
        combineSubpaths: flags.combineSubpaths,
        defaultProvider,
        resolutions: getResolutions(flags),
        cache: getCacheMode(flags),
        integrity: flags.integrity,
        commonJS: true, // TODO: only for --local flag
        // Pass provider configs from configuration file
        providerConfig: config.providers,
      },
      configOverride
    )
  );
}

export async function getInput(
  flags: GenerateFlags,
  fallbackDefaultMap = defaultMapPath
): Promise<string | undefined> {
  const mapFile = getInputPath(flags, fallbackDefaultMap);
  if (!exists(mapFile)) return undefined;
  if (!canRead(mapFile)) {
    if (mapFile === defaultMapPath) return undefined;
    else
      throw new JspmError(`JSPM does not have permission to read ${mapFile}.`);
  }
  return fs.readFile(mapFile, "utf-8");
}

async function getInputMap(flags: GenerateFlags): Promise<IImportMapJspm> {
  let inputMap;

  const input = await getInput(flags);
  const mapUrl = getOutputMapUrl(flags);
  if (input) {
    try {
      inputMap = JSON.parse(input) as IImportMapJspm;
    } catch {
      try {
        const analysis = analyzeHtml(input, mapUrl);
        inputMap = analysis.map;
      } catch {
        throw new JspmError(
          `Input map "${getInputPath(
            flags
          )}" is neither a valid JSON or a HTML file containing an inline import map.`
        );
      }
    }
  }

  return (inputMap || {}) as IImportMapJspm;
}

export function getInputPath(
  flags: GenerateFlags,
  fallbackDefaultMap = defaultMapPath
): string {
  return path.resolve(
    process.cwd(),
    flags?.map || (exists(defaultMapPath) ? defaultMapPath : fallbackDefaultMap)
  );
}

export function getOutputPath(flags: GenerateOutputFlags): string {
  return path.resolve(
    process.cwd(),
    flags.output || flags.map || defaultMapPath
  );
}

function getOutputMapUrl(flags: GenerateOutputFlags): URL {
  return pathToFileURL(getOutputPath(flags));
}

function getRootUrl(flags: GenerateOutputFlags): URL | undefined {
  if (!flags?.root) return undefined;
  return pathToFileURL(path.resolve(process.cwd(), flags.root));
}

const excludeDefinitions = {
  production: ["development"],
  development: ["production"],
  node: ["browser", "deno"],
  deno: ["node", "browser"],
  browser: ["node", "deno"],
};

function removeEnvs(env: string[], removeEnvs: string[]) {
  for (const removeEnv of removeEnvs) {
    if (env.includes(removeEnv)) env.splice(env.indexOf(removeEnv), 1);
  }
  return env.sort();
}
function addEnvs(env: string[], newEnvs: string[]) {
  let excludeEnvs = [];
  for (const newEnv of newEnvs) {
    if (!env.includes(newEnv)) env.push(newEnv);
    const excludes = excludeDefinitions[newEnv];
    if (excludes) excludeEnvs = excludeEnvs.concat(excludes);
  }
  for (const exclude of excludeEnvs) {
    if (env.includes(exclude) && !newEnvs.includes(exclude))
      env.splice(env.indexOf(exclude), 1);
  }
  return env.sort();
}

export async function getEnv(flags: GenerateFlags) {
  const inputMap = await getInputMap(flags);
  const envFlags = Array.isArray(flags?.env)
    ? flags.env
    : (flags.env || "")
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);
  let env = inputMap.env || ["development", "browser", "module"];
  env = removeEnvs(
    env,
    envFlags.filter((env) => env.startsWith("no-")).map((env) => env.slice(3))
  );
  env = addEnvs(
    env,
    envFlags.filter((env) => !env.startsWith("no-"))
  );

  return removeNonStaticEnvKeys(env);
}

function getProvider(
  flags: GenerateFlags
): (typeof availableProviders)[number] {
  if (flags.provider && !availableProviders.includes(flags.provider))
    throw new JspmError(
      `Invalid provider "${
        flags.provider
      }". Available providers are: "${availableProviders.join('", "')}".`
    );
  return flags.provider!;
}

function removeNonStaticEnvKeys(env: string[]) {
  return env.filter(
    (e) => e !== "import" && e !== "require" && e !== "default"
  );
}

function getResolutions(
  flags: GenerateFlags
): Record<string, string> | undefined {
  if (!flags.resolution) return;
  const resolutions = Array.isArray(flags.resolution)
    ? flags.resolution
    : flags.resolution.split(",").map((r) => r.trim());

  return Object.fromEntries(
    resolutions.map((resolution) => {
      if (!resolution.includes("=")) {
        throw new JspmError(
          `Resolutions must be mappings from package names to package versions or specifiers, such as ${c.bold(
            "--resolution pkg=1.2.3"
          )} or ${c.bold("--resolution pkg=npm:other@1.2.3")}`
        );
      }
      return resolution.split("=");
    })
  );
}

const validCacheModes = ["online", "offline", "no-cache"];
function getCacheMode(flags: GenerateFlags): "offline" | boolean {
  if (!flags.cache) return true;
  if (!validCacheModes.includes(flags.cache))
    throw new JspmError(
      `Invalid cache mode "${
        flags.cache
      }". Available modes are: "${validCacheModes.join('", "')}".\n\t${c.bold(
        "online"
      )}   Use a locally cached module if available and fresh.\n\t${c.bold(
        "offline"
      )}   Use a locally cached module if available, even if stale.\n\t${c.bold(
        "no-cache"
      )}   Never use the local cache.`
    );

  if (flags.cache === "offline") return "offline";
  if (flags.cache === "online") return true;
  return false;
}

const validPreloadModes = ["static", "dynamic"];
function getPreloadMode(flags: GenerateFlags): boolean | "static" | "all" {
  if (flags.preload === null || flags.preload === undefined) return false;
  if (typeof flags.preload === "boolean") {
    return flags.preload;
  }

  if (!validPreloadModes.includes(flags.preload))
    throw new JspmError(
      `Invalid preload mode "${
        flags.preload
      }". Available modes are: "${validPreloadModes.join(
        '", "'
      )}" (default).\n\t${c.bold(
        "static"
      )}  Inject preload tags for static dependencies.\n\t${c.bold(
        "dynamic"
      )} Inject preload tags for static and dynamic dependencies.`
    );

  if (flags.preload === "static") return "static";
  if (flags.preload === "dynamic") return "all";
  return false; // should never get here
}

const spinner = ora({ spinner: "dots" });

export function startSpinner(text: string) {
  spinner.start(text);
}
export function stopSpinner() {
  spinner.stop();
}

export function exists(file: string) {
  try {
    accessSync(file);
    return true;
  } catch (e) {
    return false;
  }
}

function canRead(file: string) {
  try {
    accessSync(file, (fs.constants || fs).R_OK);
    return true;
  } catch (e) {
    return false;
  }
}

function canWrite(file: string) {
  try {
    if (!exists(file)) return true;
    accessSync(file, (fs.constants || fs).W_OK);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Takes an npm-style package specifier (such as "react@^16.8.0") and returns
 * the package name (in this case "react").
 *   see https://docs.npmjs.com/cli/v8/using-npm/package-spec
 */
export function parsePackageSpec(pkgTarget: string): string {
  if (pkgTarget.startsWith("@")) return `@${pkgTarget.slice(1).split("@")[0]}`;
  return pkgTarget.split("@")[0];
}

/**
 * Returns true if the given specifier is a relative URL or a URL.
 */
export function isUrlLikeNotPackage(spec: string): boolean {
  if (spec.startsWith("./") || spec.startsWith("../") || spec.startsWith("/"))
    return true;
  try {
    // eslint-disable-next-line no-new
    new URL(spec);
    return spec[spec.indexOf(":") + 1] === "/";
  } catch {
    return false;
  }
}

export function copyToClipboard(text) {
  try {
    switch (platform()) {
      case "darwin":
        return execSync("pbcopy", {
          input: text,
          stdio: ["pipe", "ignore", "ignore"],
        });
      case "win32": {
        const tempFile = path.join(tmpdir(), `clipboard-${Date.now()}.txt`);
        try {
          writeFileSync(tempFile, text, "utf8");
          return execSync(
            `powershell -command "Get-Content '${tempFile}' -Raw | Set-Clipboard"`,
            {
              stdio: "ignore",
            }
          );
        } finally {
          unlinkSync(tempFile);
        }
      }
      case "linux":
        try {
          execSync(`echo "${text}" | xclip -selection clipboard`, {
            stdio: "ignore",
          });
        } catch {
          execSync(`echo "${text}" | xsel --clipboard`, { stdio: "ignore" });
        }
    }
  } catch {}
}

export async function getFilesRecursively(
  directory: string,
  ignore: string[] = [],
  include: string[] = []
): Promise<string[]> {
  const files: string[] = [];

  async function processDirectory(dir: string, parentIncluded: boolean) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(directory, fullPath);

      if (
        entry.name === "node_modules" ||
        entry.name.startsWith(".") ||
        entry.name === "package-lock.json"
      ) {
        continue;
      }

      if (ignore.includes(relativePath) || ignore.includes(entry.name)) {
        continue;
      }

      if (entry.isDirectory()) {
        await processDirectory(
          fullPath,
          parentIncluded || include.includes(relativePath)
        );
      } else if (include.length === 0) {
        // Include file if it's not ignored
        files.push(fullPath);
      } else if (
        parentIncluded ||
        include.some((include) => minimatch(relativePath, include))
      ) {
        // When includes are provided, only include explicitly included
        files.push(fullPath);
      }
    }
  }

  await processDirectory(directory, false);
  return files;
}

export async function runPackageScript(script: string, dir: string) {
  const isWindows = platform() === "win32";

  let shell: string, shellArgs: string[];
  if (isWindows) {
    // Try to find cmd.exe in standard locations
    const possiblePaths = [
      path.join(process.env.SystemRoot || "C:\\Windows", "System32", "cmd.exe"),
      path.join(process.env.windir || "C:\\Windows", "System32", "cmd.exe"),
      "cmd.exe", // Last resort - rely on PATH
    ];

    shell =
      possiblePaths.find((p) => {
        try {
          return existsSync(p);
        } catch {
          return false;
        }
      }) || "cmd.exe";

    shellArgs = ["/c"];
  } else {
    // For Unix-like systems, try to detect available shells
    const possibleShells = [
      "/bin/bash",
      "/bin/sh",
      "/usr/bin/bash",
      "/usr/bin/sh",
    ];

    shell =
      possibleShells.find((s) => {
        try {
          return existsSync(s);
        } catch {
          return false;
        }
      }) || "/bin/sh";

    shellArgs = ["-c"];
  }

  // Set up environment variables similar to npm
  const env = { ...process.env };
  const PATH = isWindows ? "Path" : "PATH";

  const nodeModulesPath = join(dir, "node_modules");
  if (!env[PATH]?.includes(nodeModulesPath)) {
    env[PATH] = isWindows
      ? `${nodeModulesPath};${env[PATH] || ""}`
      : `${nodeModulesPath}:${env[PATH] || ""}`;
  }

  return new Promise<void>((resolve, reject) => {
    const childProcess = spawn(shell, [...shellArgs, script], {
      env,
      stdio: "inherit", // Pipe stdio to parent process
      shell: true,
      windowsVerbatimArguments: isWindows,
    });

    childProcess.on("error", (error) => {
      reject(new Error(`Failed to start script process: ${error.message}`));
    });

    childProcess.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });
  });
}
