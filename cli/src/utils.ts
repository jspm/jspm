import fs from "node:fs/promises";
import {
  accessSync,
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path, { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { platform, tmpdir } from "node:os";
import { execSync, spawn } from "node:child_process";
import { Generator, analyzeHtml } from "@jspm/generator";
import { SemverRange } from "sver";
import ora from "ora";
import c from "picocolors";
import { minimatch } from "minimatch";
import { withType } from "./logger.ts";
import { loadConfig } from "./config.ts";
import type { IImportMap, IImportMapJspm } from "./types.ts";
import type { GenerateFlags, GenerateOutputFlags } from "./cli.ts";

// Default import map to use if none is provided:
const defaultMapPath = "importmap.js";

export function cliHtmlHighlight(code: string) {
  return code
    .split("\n")
    .map((l) => {
      if (l.startsWith("<!--") && l.endsWith("-->")) return `  ${c.gray(l)}`;
      if (l.startsWith("//")) return `  ${c.gray(l)}`;
      l = l
        .replace(/("[^"]*")/g, (s) => c.red(s))
        .replace(/\>?\<\/?script\>?/g, (s) => c.blue(s));
      return `  ${l}`;
    })
    .join("\n");
}

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
    <script type="importmap"></script>
  </head>
  <body>
  </body>
</html>`;

// JavaScript wrapper to wrap import map injection
export function isURL(url: string) {
  try {
    // eslint-disable-next-line no-new
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
function relativeUrlLike(value: string) {
  return (
    value.startsWith("./") || value.startsWith("../") || value.startsWith("/")
  );
}
export const jsTemplate = (map: IImportMap, compact: boolean) => {
  const mapJson = compact ? JSON.stringify(map) : JSON.stringify(map, null, 2);
  const importsRebase =
    map.imports &&
    (Object.keys(map.imports).some(relativeUrlLike) ||
      Object.values(map.imports).some(relativeUrlLike));
  const scopesRebase =
    map.scopes &&
    (Object.keys(map.scopes).some(relativeUrlLike) ||
      Object.values(map.scopes).some(
        (scope) =>
          Object.keys(scope).some(relativeUrlLike) ||
          Object.values(scope).some(relativeUrlLike)
      ));
  const integrityRebase =
    map.integrity && Object.keys(map.integrity).some(relativeUrlLike);
  const s = compact ? "" : " ";
  const n = compact ? "" : "\n";
  const m = compact ? "m" : "map";
  const u = compact ? "u" : "mapUrl";
  const r = compact ? "r" : "resolve";
  const i = compact ? "i" : "imports";
  const t = compact ? "" : "  ";
  return `${
    compact
      ? ""
      : `/** 
* JSPM Import Map Injection Script
* Include in any HTML page with <script src="importmap.js"></script>
*/`
  }${compact ? "" : "\n"}(${m}${s}=>${s}{${n}${t}${
    importsRebase || scopesRebase || integrityRebase
      ? `const ${u}${s}=${s}document.currentScript.src;${n}${t}const ${r}${s}=${s}${i}${s}=>${s}Object.fromEntries(Object.entries(${i}${s}).map(([k,${s}v])${s}=>${s}[k,${s}new URL(v,${s}${u}).href]));${n}${t}`
      : ""
  }document.head.appendChild(Object.assign(document.createElement("script"),${s}{${n}${t}${t}type:${s}"importmap",${n}${t}${t}innerHTML:${s}JSON.stringify({${n}${t}${t}${t}imports:${s}${
    importsRebase ? `${r}(${m}.imports)` : `${m}.imports`
  }${map.scopes || map.integrity ? `,${n}` : ""}${
    map.scopes
      ? `${t}${t}${t}scopes:${s}${
          scopesRebase
            ? `Object.fromEntries(Object.entries(${m}.scopes).map(([k,${s}v])${s}=>${s}[new URL(k,${s}${u}).href,${s}${r}(v)]))`
            : `${m}.scopes`
        }`
      : ""
  }${map.integrity ? `,${n}` : ""}${
    map.integrity
      ? `${t}${t}${t}integrity:${s}${
          integrityRebase
            ? `Object.fromEntries(Object.entries(${m}.integrity).map(([k,${s}v])${s}=>${s}[new URL(k,${s}${u}).href,${s}v]))${n}`
            : `${m}.integrity`
        }`
      : ""
  }${n}${t}${t}})${n}${t}}))${compact ? "" : ";"}${n}})
(${mapJson});
`;
};

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
): Promise<IImportMap | undefined> {
  if (flags.stdout) return writeStdoutOutput(generator, pins);

  const mapFile = getOutputPath(flags);
  if (mapFile.endsWith(".html")) {
    return writeHtmlOutput(mapFile, generator, pins, env, flags, silent);
  } else if (mapFile.endsWith(".js")) {
    return writeJsOutput(mapFile, generator, pins, env, flags, silent);
  }
  return writeJsonOutput(mapFile, generator, pins, env, flags, silent);
}

async function writeStdoutOutput(generator: Generator, pins: string[] | null) {
  let map: IImportMapJspm = pins?.length
    ? (await generator.extractMap(pins))?.map
    : generator.getMap();
  map = { ...map };

  console.log(JSON.stringify(map, null, 2));
  return map;
}

async function writeHtmlOutput(
  mapFile: string,
  generator: Generator,
  pins: string[] | null,
  env: string[],
  flags: GenerateOutputFlags,
  silent = false
): Promise<undefined> {
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

async function writeJsOutput(
  mapFile: string,
  generator: Generator,
  pins: string[] | null,
  env: string[],
  flags: GenerateOutputFlags,
  silent = false
) {
  const log = withType("utils/writeJsOutput");

  // Get the map in the same way as writeJsonOutput
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

  const jsWrapper = jsTemplate(map, flags.compact || false);

  const existing = exists(mapFile);
  await fs.writeFile(mapFile, jsWrapper);
  const mapFileRel = path.relative(process.cwd(), mapFile);
  !silent &&
    console.warn(
      `${c.green("Ok:")} ${existing ? "Updated" : "Created"} ${c.cyan(
        mapFileRel
      )} import map injection script`
    );

  return map;
}

async function writeJsonOutput(
  mapFile: string,
  generator: Generator,
  pins: string[] | null,
  env: string[],
  flags: GenerateOutputFlags,
  silent = false
): Promise<IImportMap> {
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
  configOverride: any = null,
  inputMap?: IImportMap | undefined
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
        inputMap: inputMap || (await getInputMap(flags)),
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

function findJsMap(
  input: string,
  mapPath: string
): { map: IImportMap; range: [number, number] } {
  try {
    // Regex to find a JSON import map object in a JS file
    const jspmMapRegex =
      /({(?:\s*"env"\s*:\s*\[[^\]]*\],)?(?:\s*"imports"\s*:\s*{[^{}]*(?:{[^{}]*}[^{}]*)*})(?:\s*,\s*"scopes"\s*:\s*{[^{}]*(?:{[^{}]*}[^{}]*)*})?(?:\s*,\s*"integrity"\s*:\s*{[^{}]*})?(?:\s*,\s*"env"\s*:\s*\[[^\]]*\])?\s*})/;
    const mapMatch = jspmMapRegex.exec(input);
    if (mapMatch && mapMatch[1]) {
      try {
        try {
          return {
            map: JSON.parse(mapMatch[1]) as IImportMapJspm,
            range: [mapMatch.index, mapMatch.index + mapMatch[1].length],
          };
        } catch (jsonError) {
          throw new JspmError(
            `Found a potential import map in JavaScript file, but it is not valid JSON: ${jsonError.message}`
          );
        }
      } catch (jsonError) {
        throw new JspmError(
          `Found a potential import map in JavaScript file, but it must be valid JSON: ${jsonError.message}`
        );
      }
    } else {
      const objectIdx = input.lastIndexOf("{}");
      if (objectIdx !== -1)
        return {
          map: {} as IImportMapJspm,
          range: [objectIdx, objectIdx + 2],
        };
      throw new JspmError(
        `Could not find a valid import map object in the JavaScript file "${mapPath}"`
      );
    }
  } catch (jsError) {
    throw new JspmError(
      `Failed to extract import map from JavaScript file "${mapPath}": ${jsError.message}`
    );
  }
}

export function readInputMap(
  mapPath: string,
  fallbackDefaultMap = defaultMapPath
) {
  let input;
  if (exists(mapPath)) {
    if (canRead(mapPath)) {
      input = readFileSync(mapPath, "utf-8");
    } else if (
      mapPath !== resolve(defaultMapPath) &&
      mapPath !== resolve(fallbackDefaultMap)
    ) {
      // Only throw permissions errorsfor non default paths
      throw new JspmError(`JSPM does not have permission to read ${mapPath}.`);
    }
  }
  if (!input) {
    return {} as IImportMapJspm;
  }
  try {
    // Direct JSON parsing for JSON files
    return JSON.parse(input) as IImportMapJspm;
  } catch {
    // If this is a JavaScript file, try to extract import map using regex
    if (
      mapPath.endsWith(".js") ||
      mapPath.endsWith(".ts") ||
      mapPath.endsWith(".mjs") ||
      mapPath.endsWith(".mts")
    ) {
      return findJsMap(input, mapPath).map;
    } else {
      try {
        // Try to parse as HTML with import map
        const analysis = analyzeHtml(input, pathToFileURL(mapPath));
        return analysis.map?.json || ({} as IImportMapJspm);
      } catch (e) {
        throw new JspmError(
          `Input map "${mapPath}" is neither a valid JSON, HTML file containing an inline import map, nor a JavaScript file with an import map.`
        );
      }
    }
  }
}

export function getInputMap(
  flags: GenerateFlags,
  fallbackDefaultMap = defaultMapPath
): IImportMapJspm {
  return readInputMap(
    getInputPath(flags, fallbackDefaultMap),
    fallbackDefaultMap
  );
}

export function getInputPath(
  flags: GenerateFlags,
  fallbackDefaultMap = defaultMapPath
): string {
  const mapPath = flags?.map;
  if (mapPath) {
    return resolve(mapPath);
  }

  // If importmap.json exists, use it
  if (exists(defaultMapPath)) {
    return resolve(defaultMapPath);
  }

  // Otherwise use the provided fallback
  return resolve(fallbackDefaultMap);
}

export function getOutputPath(flags: GenerateOutputFlags): string {
  // If output or map is specified, use that
  if (flags.out || flags.map) {
    return resolve(flags.out || (flags.map as string));
  }

  // If importmap.json exists, use that
  if (exists(defaultMapPath)) {
    return resolve(defaultMapPath);
  }

  // Default to importmap.json if nothing else is available
  return resolve(defaultMapPath);
}

function getOutputMapUrl(flags: GenerateOutputFlags): URL {
  return pathToFileURL(getOutputPath(flags));
}

function getRootUrl(flags: GenerateOutputFlags): URL | undefined {
  if (!flags?.root) return undefined;
  return pathToFileURL(resolve(flags.root));
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
  const envFlags = Array.isArray(flags?.conditions)
    ? flags.conditions
    : (flags.conditions || "")
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

export async function isDirectory(path: string): Promise<boolean> {
  try {
    const stats = await fs.stat(path);
    return stats.isDirectory();
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
      const relativePath = path
        .relative(directory, fullPath)
        .replace(/\\/g, "/");

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

/**
 * Finds the nearest package.json file starting from the given directory
 * and traversing up the directory tree.
 *
 * @param dir The directory to start searching from
 * @returns An object containing the package.json contents and its path, or null if not found
 */
export async function getPackageJson(dir?: string): Promise<{
  packageJson: any;
  packagePath: string;
} | null> {
  let currentDir = resolve(dir || process.cwd());
  const rootDir = resolve("/");
  while (currentDir !== rootDir) {
    const packageJsonPath = path.join(currentDir, "package.json");
    if (exists(packageJsonPath)) {
      const content = await fs.readFile(packageJsonPath, "utf8");
      try {
        const packageJson = JSON.parse(content);
        return {
          packageJson,
          packagePath: currentDir,
        };
      } catch (jsonError) {
        throw new JspmError(
          `Invalid package.json file at ${path
            .relative(process.cwd(), packageJsonPath)
            .replace(/\\/g, "/")} - ${jsonError.message}`
        );
      }
    }
    if (dir) return null;
    currentDir = path.dirname(currentDir);
  }
  return null;
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

export async function getLatestEsms(generator: Generator, provider: string) {
  // @ts-expect-error generator internals
  const esmsPkg = await generator.traceMap.resolver.pm.resolveLatestTarget(
    {
      name: "es-module-shims",
      registry: "npm",
      ranges: [new SemverRange("*")],
    },
    // @ts-expect-error generator internals
    generator.traceMap.installer.defaultProvider
  );
  return `${await generator.traceMap.resolver.pm.pkgToUrl(
    esmsPkg,
    provider,
    "default"
  )}dist/es-module-shims.js`;
}

export function getMapMatch<T = any>(
  specifier: string,
  map: Record<string, T>
): string | undefined {
  if (specifier in map) return specifier;
  let bestMatch;
  for (const match of Object.keys(map)) {
    const wildcardIndex = match.indexOf("*");
    if (!match.endsWith("/") && wildcardIndex === -1) continue;
    if (match.endsWith("/")) {
      if (specifier.startsWith(match)) {
        if (!bestMatch || match.length > bestMatch.length) bestMatch = match;
      }
    } else {
      const prefix = match.slice(0, wildcardIndex);
      const suffix = match.slice(wildcardIndex + 1);
      if (
        specifier.startsWith(prefix) &&
        specifier.endsWith(suffix) &&
        specifier.length > prefix.length + suffix.length
      ) {
        if (
          !bestMatch ||
          !bestMatch.startsWith(prefix) ||
          !bestMatch.endsWith(suffix)
        )
          bestMatch = match;
      }
    }
  }
  return bestMatch;
}

export function allDotKeys(exports: Record<string, any>) {
  for (const p in exports) {
    if (p[0] !== ".") return false;
  }
  return true;
}

/**
 * Expand a package exports field into its set of subpaths and resolution
 * With an optional file list for expanding globs
 */
export function expandExportsResolutions(
  exports: any | Record<string, any>,
  env: string[],
  files?: Set<string> | undefined,
  exportsResolutions: Map<string, string> = new Map()
) {
  if (typeof exports !== "object" || exports === null || !allDotKeys(exports)) {
    const targetList = new Set<string>();
    expandTargetResolutions(exports, files, env, targetList, [], true);
    for (const target of targetList) {
      if (target.startsWith("./")) {
        const targetFile = target.slice(2);
        if (!files || files.has(targetFile))
          exportsResolutions.set(".", targetFile);
      }
    }
  } else {
    for (const subpath of Object.keys(exports)) {
      const targetList = new Set<string>();
      expandTargetResolutions(
        exports[subpath],
        files,
        env,
        targetList,
        [],
        true
      );
      for (const target of targetList) {
        expandExportsTarget(
          exports as Record<string, any>,
          subpath,
          target,
          files,
          exportsResolutions
        );
      }
    }
  }
}

/**
 * Expand a package exports field into a list of entry points
 * With an optional file list for expanding globs
 */
export function expandExportsEntries(
  exports: any | Record<string, any>,
  env: string[],
  files?: Set<string> | undefined,
  entriesList: Set<string> = new Set()
) {
  if (typeof exports !== "object" || exports === null || !allDotKeys(exports)) {
    const targetList = new Set<string>();
    expandTargetResolutions(exports, files, env, targetList, [], false);
    for (const target of targetList) {
      if (target.startsWith("./")) {
        const targetFile = target.slice(2);
        if (!files || files.has(targetFile)) entriesList.add(targetFile);
      }
    }
  } else {
    for (const subpath of Object.keys(exports)) {
      const targetList = new Set<string>();
      expandTargetResolutions(
        exports[subpath],
        files,
        env,
        targetList,
        [],
        false
      );
      for (const target of targetList) {
        const map = new Map();
        expandExportsTarget(
          exports as Record<string, any>,
          subpath,
          target,
          files,
          map
        );
        for (const entry of map.values()) {
          entriesList.add(entry);
        }
      }
    }
  }
}

/**
 * Expand the given exports target into its possible resolution list,
 * given an environment union.
 * Unknown environment conditions are expanded, with handling for
 * mutual exclusions between environment conditions - i.e. if env is [], and we
 * expand into a "production" branch of the environment, then "development" branches
 * will be excluded on that walk of the branch further.
 */
const conditionMutualExclusions = {
  production: "development",
  development: "production",
  import: "require",
  require: "import",
};
function expandTargetResolutions(
  exports: any,
  files: Set<string> | undefined,
  env: string[],
  targetList: Set<string>,
  envExclusions = env
    .map((condition) => conditionMutualExclusions[condition])
    .filter((c) => c),
  firstOnly: boolean
): boolean {
  if (typeof exports === "string") {
    if (exports.startsWith("./")) targetList.add(exports);
    return true;
  } else if (Array.isArray(exports)) {
    for (const item of exports) {
      if (
        expandTargetResolutions(
          item,
          files,
          env,
          targetList,
          envExclusions,
          firstOnly
        )
      )
        return true;
    }
    return false;
  } else if (exports === null) {
    // the null resolution target is a match for not resolving
    return true;
  } else {
    let hasSomeResolution = false;
    for (const condition of Object.keys(exports)) {
      if (condition.startsWith(".")) continue;
      if (condition === "default" || env.includes(condition)) {
        if (
          expandTargetResolutions(
            exports[condition],
            files,
            env,
            targetList,
            envExclusions,
            firstOnly
          )
        ) {
          return true;
        }
      }
      if (envExclusions.includes(condition)) continue;
      const maybeNewExclusion = conditionMutualExclusions[condition];
      const newExclusions =
        maybeNewExclusion && !envExclusions.includes(maybeNewExclusion)
          ? [...envExclusions, maybeNewExclusion]
          : envExclusions;
      // if we did match the condition, then we know any subsequent condition checks are under exclusion as well
      if (
        expandTargetResolutions(
          exports[condition],
          files,
          env,
          targetList,
          newExclusions,
          firstOnly
        )
      ) {
        if (firstOnly) return true;
        hasSomeResolution = true;
        envExclusions = newExclusions;
      }
    }
    return hasSomeResolution;
  }
}

/**
 * Expands the given target string into the entries list,
 * handling wildcard globbing
 */
function expandExportsTarget(
  exports: Record<string, any>,
  subpath: string,
  target: string,
  files: Set<string> | undefined,
  entriesMap: Map<string, string>
) {
  if (
    !target.startsWith("./") ||
    !(subpath.startsWith("./") || subpath === ".")
  )
    return;
  if (!target.includes("*") || !subpath.includes("*")) {
    const targetFile = target.slice(2);
    if (!files || files.has(targetFile))
      entriesMap.set(subpath, target.slice(2));
    return;
  }
  if (!files) return;

  // First determine the list of files that could match the target glob
  const lhs = target.slice(2, target.indexOf("*"));
  const rhs = target.slice(target.indexOf("*") + 1);

  const fileMatches = new Set<string>();
  for (const file of files) {
    if (
      file.startsWith(lhs) &&
      file.endsWith(rhs) &&
      file.length > lhs.length + rhs.length
    ) {
      fileMatches.add(file);
    }
  }

  // Backtrack to determine their original subpaths and
  // re-resolve those subpaths to verify they do indeed resolve to our target glob
  // since they could be shadowed by other subpath resolutions
  for (const fileMatch of fileMatches) {
    const pattern = fileMatch.slice(lhs.length, fileMatch.length - rhs.length);
    const originalSubpath = subpath.replace("*", pattern);
    const matchedSubpath = getMapMatch(originalSubpath, exports);
    if (matchedSubpath === subpath) entriesMap.set(originalSubpath, fileMatch);
  }
}

/**
 * Expands the exports resolution set of a package against the filesystem
 * Returns the record mapping packagename/subpath entries to file paths
 */
export function getExportsEntries(
  name: string,
  exports: any,
  fileList: string[],
  env: string[]
): Record<string, string[]> {
  const resolutionMap = new Map<string, string>();
  expandExportsResolutions(exports, env, new Set(fileList), resolutionMap);
  const outMap = {};
  for (const [subpath, entry] of resolutionMap) {
    const expt = name + subpath.slice(1);
    outMap[expt] = outMap[expt] || [];
    outMap[expt].push(entry);
  }
  return outMap;
}
