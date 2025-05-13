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

import { readFileSync } from "node:fs";
import c from "picocolors";
import cac, { type Command } from "cac";
import clearCache from "./clearCache.ts";
import install from "./install.ts";
import link from "./link.ts";
import uninstall from "./uninstall.ts";
import update from "./update.ts";
import configCmd from "./config-cmd.ts";
import { JspmError, availableProviders, wrapCommand } from "./utils.ts";
import build from "./build/index.ts";
import { eject, publish } from "./deploy.ts";
import * as provider from "./provider.ts";

const { version } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
);

export const cli = cac(c.yellow("jspm"));

type OptionGroup = (input: Command) => Command;

const generateOpts: OptionGroup = (cac) =>
  cac
    .option(
      "-m, --map <file>",
      "File containing initial import map (defaults to importmap.json, or the input HTML if linking)",
      {}
    )
    .option(
      "-e, --env <environments>",
      "Comma-separated environment condition overrides",
      {}
    )
    .option(
      "-r, --resolution <resolutions>",
      "Comma-separated dependency resolution overrides",
      {}
    )
    .option(
      "-p, --provider <provider>",
      `Default module provider. Available providers: ${availableProviders.join(
        ", "
      )}`,
      {}
    )
    .option(
      "--cache <mode>",
      "Cache mode for fetches (online, offline, no-cache)",
      { default: "online" }
    )
    .option(
      "--integrity",
      "Add module integrity attributes to the import map",
      { default: false }
    )
    .option(
      "--preload [mode]",
      "Add module preloads to HTML output (default: static, dynamic)",
      {}
    );

export interface GenerateFlags extends BaseFlags {
  map?: string;
  env?: string | string[];
  resolution?: string | string[];
  provider?: string;
  cache?: string;
  preload?: boolean | string;
  integrity?: boolean;
}

const outputOpts: OptionGroup = (cac) =>
  cac
    .option(
      "--root <url>",
      "URL to treat as server root, i.e. rebase import maps against",
      {}
    )
    .option(
      "--no-flatten-scopes",
      "Disable import map scope flattening into a single top-level scope per origin",
      { default: true }
    )
    .option(
      "--no-combine-subpaths",
      "Disable import map subpath combining under folder maps (ending in /)",
      { default: true }
    )
    .option("--compact", "Output a compact import map", { default: false })
    .option("--stdout", "Output the import map to stdout", { default: false })
    .option(
      "-o, --output <file>",
      "File to inject the final import map into (default: --map / importmap.json)",
      {}
    )
    .option(
      "--strip-env",
      "Do not inline the environment into the importmap.",
      { default: false }
    );

export interface GenerateOutputFlags extends GenerateFlags {
  root?: string;
  compact?: boolean;
  stdout?: boolean;
  output?: string;
  stripEnv?: boolean;
  flattenScopes?: boolean;
  combineSubpaths?: boolean;
}

export interface BaseFlags {
  silent?: boolean;
  showVersion?: boolean;
}

cli
  .option("-s, --silent", "Silence all output", { default: false })
  .option("--show-version", "Output the JSPM version", { default: false })
  .help(defaultHelpCb);

// Fallback command:
cli
  .command("[...args]")
  .allowUnknownOptions()
  .usage("[command] [options]")
  .action(
    wrapCommand((args) => {
      if (!args.length) return cli.outputHelp();
      throw new JspmError(
        `Unknown command: ${args[0]}\nRun "jspm" without any arguments to see the help file.`
      );
    })
  );

outputOpts(
  generateOpts(cli.command("link [...modules]", "link modules").alias("trace"))
)
  .example(
    (name) => `Link a remote package in importmap.json
  $ ${name} link chalk@5.2.0
`
  )
  .example(
    (name) => `Link a local module
  $ ${name} link ./src/cli.js
`
  )
  .example(
    (
      name
    ) => `Link an HTML file and update its import map including preload and integrity tags
  $ ${name} link --map index.html --integrity --preload
`
  )
  .usage(
    `link [flags] [...modules]

Traces and installs all dependencies necessary to execute the given modules into an import map, including both static and dynamic module imports. The given modules can be:
  1. Paths to local JavaScript modules, such as "./src/my-module.mjs".
  2. Paths to local HTML files, such as "index.html", in which case all module scripts in the file are linked.
  3. Valid package specifiers, such as \`react\` or \`chalk@5.2.0\`, in which case the package's main export is linked.
  4. Valid package specifiers with subpaths, such as \`sver@1.1.1/convert-range\`, in which case the subpath is resolved against the package's exports and the resulting module is linked.

In some cases there may be ambiguity. For instance, you may want to link the NPM package "app.js", but your working directory contains a local file called "app.js" as well. In these cases local files are preferred by default, and external packages must be prefixed with the "%" character (i.e. "%app.js").

If no modules are given, all "imports" in the initial map are relinked.`
  )
  .action(wrapCommand(link));

outputOpts(
  generateOpts(
    cli.command("install [...packages]", "install packages").alias("i")
  )
)
  .example(
    (name) => `Install a package
  $ ${name} install lit
`
  )
  .example(
    (name) => `Install a versioned package and subpath
  $ ${name} install npm:lit@2.2.0/decorators.js
`
  )
  .example(
    (name) => `Install a versioned package
  $ ${name} install npm:react@18.2.0
`
  )
  .example(
    (name) => `Install a Denoland package and use the Deno provider
  $ ${name} install -p deno denoload:oak
`
  )
  .example(
    (name) => `Install "alias" as an alias of the resolution react
  $ ${name} install alias=react
`
  )
  .usage(
    `install [flags] [...packages]

Installs packages into an import map, along with all of the dependencies that are necessary to import them.` +
      `By default, the latest versions of the packages that are compatible with the local "package.json" are ` +
      `installed, unless an explicit version is specified. The given packages must be valid package specifiers, ` +
      `such as \`npm:react@18.0.0\` or \`denoland:oak\`. If a package specifier with no registry is given, such as ` +
      `\`lit\`, the registry is assumed to be NPM. Packages can be installed under an alias by using specifiers such ` +
      `as \`myname=npm:lit@2.1.0\`. An optional subpath can be provided, such as \`npm:lit@2.2.0/decorators.js\`, in ` +
      `which case only the dependencies for that subpath are installed.

If no packages are provided, all "imports" in the initial map are reinstalled.`
  )

  .action(wrapCommand(install));

outputOpts(
  generateOpts(cli.command("uninstall [...packages]", "remove packages"))
)
  .example(
    (name) => `
$ ${name} uninstall lit lodash

Uninstall "lit" and "lodash" from importmap.json.
`
  )
  .usage(
    `uninstall [flags] [...packages]

Uninstalls packages from an import map. The given packages must be valid package specifiers, such as \`npm:react@18.0.0\`, \`denoland:oak\` or \`lit\`, and must be present in the initial import map.`
  )
  .action(wrapCommand(uninstall));

outputOpts(
  generateOpts(
    cli.command("update [...packages]", "update packages").alias("upgrade")
  )
)
  .example(
    (name) => `
$ ${name} update react-dom

Update the react-dom package.
`
  )
  .usage(
    `update [flags] [...packages]

Updates packages in an import map to the latest versions that are compatible with the local \`package.json\`. The given packages must be valid package specifiers, such as \`npm:react@18.0.0\`, \`denoland:oak\` or \`lit\`, and must be present in the initial import map.`
  )
  .action(wrapCommand(update));

cli
  .command("clear-cache", "clear the local package cache")
  .usage(
    `clear-cache

Clears the global module fetch cache, for situations where the contents of a dependency may have changed without a version bump. This can happen during local development, for instance.`
  )
  .alias("cc")
  .action(wrapCommand(clearCache));

cli
  .command("config <action> [key] [value]", "manage JSPM configuration")
  .option(
    "--local",
    "Use the local project configuration (default is user-level)",
    { default: false }
  )
  .option(
    "-p, --provider <provider>",
    "Provider to configure (for provider-specific configuration)",
    {}
  )
  .example(
    (name) => `
$ ${name} config set -p npm auth "your-auth-token"

Set an authentication token for the npm provider in the user configuration.
`
  )
  .example(
    (name) => `
$ ${name} config set --provider jspm.io baseUrl "https://jspm.io/" --local

Set the base URL for a provider with dots in its name in the local project configuration.
`
  )
  .example(
    (name) => `
$ ${name} config get -p npm

Get the npm provider configuration.
`
  )
  .example(
    (name) => `
$ ${name} config list

List all configuration values.
`
  )
  .usage(
    `config <action> [key] [value]

Manages JSPM configuration files. Configurations are loaded from the user directory (~/.jspm/config) 
and local directory (.jspmrc), with local configuration taking precedence over user configuration.

Actions:
  get <key>             Get a configuration value
  set <key> <value>     Set a configuration value
  delete|rm <key>       Delete a configuration value
  list|ls               List all configuration values
  
For provider-specific configuration, use the -p/--provider flag:
  jspm config set -p npm auth token123
  jspm config set -p jspm.io baseUrl https://jspm.io/

The provider flag handles providers with dots in their names automatically.
Other configuration keys use dot notation (e.g., defaultProvider, cacheDir).
Values are parsed as JSON if possible, otherwise used as strings.

By default, the command affects the user configuration (~/.jspm/config).
Use the --local flag to modify the project-specific configuration (.jspmrc).`
  )
  .action(wrapCommand(configCmd));

export interface ConfigFlags extends BaseFlags {
  local?: boolean;
  provider?: string;
}

cli
  .command("build [entry]", "Build the module using importmap")
  .option(
    "-r, --resolution <resolutions>",
    "Comma-separated dependency resolution overrides",
    {}
  )
  .option(
    "-m, --map <file>",
    "File containing initial import map (defaults to importmap.json, or the input HTML if linking)",
    {}
  )
  .option("--config <file>", "Path to a RollupJS config file", {})
  .option("-o, --out <dir>", "Path to the RollupJS output directory", {})
  .action(wrapCommand(build));

export interface BuildFlags extends BaseFlags {
  entry?: string;
  config?: string;
  out?: string;
}

// Main deploy command - with options for both publish and eject
outputOpts(
  generateOpts(
    cli
      .command("deploy <action> [target]", "Deploy operations for the JSPM CDN")
      .option(
        "--no-usage",
        "Disable printing the usage code snippet for the deployment (for publish)",
        { default: true }
      )
      .option(
        "-w, --watch",
        "Watch for changes and redeploy (experimental, for publish)",
        {
          default: false,
        }
      )
      .option(
        "-n, --name <name>",
        "Publish with a custom name instead of the name from package.json (for publish)",
        {}
      )
      .option(
        "-v, --version <version>",
        "Publish with a custom version instead of the version from package.json (for publish)",
        {}
      )
      .option(
        "-d, --dir <directory>",
        "Directory to eject into (for eject)",
        {}
      )
  )
    .example(
      (name) => `
$ ${name} deploy publish

Publish the current directory as a package to the JSPM CDN.
`
    )
    .example(
      (name) => `
$ ${name} deploy publish dist

Publish the ./dist directory as a package to the JSPM CDN.
`
    )
    .example(
      (name) => `
$ ${name} deploy publish dist --version dev-feat-2 --watch

Start a watched deployment to a custom mutable version tag (dev-feat-2) instead of the version from package.json.
`
    )
    .example(
      (name) => `
$ ${name} deploy eject app:foo@bar --dir foo

Download the application package foo@bar into the folder foo, merging its import map into importmap.json.
`
    )
    .example(
      (name) => `
$ ${name} deploy eject app:foo@bar --dir foo -o test.html

Download the application package foo@bar into the folder foo, merging its import map into the provided HTML file.
`
    )
    .usage(
      `deploy <action> [target]

Manages deployments to the JSPM CDN.

Actions:
  publish [directory]    Publish a package to the JSPM CDN
  eject <package>        Eject an app deployment package into a local folder

For publish:
  The package must have a valid package.json with name and version fields.
  A jspm.json file can be included with "ignore" and "include" arrays to specify which files should be included.
  By default, the current directory is published.
  Semver versions are always immutable deployments that cannot be redeployed.
  Mutable versions supporting redeployment must only contain alphanumeric characters, hyphens, and underscores [a-zA-Z0-9_-].

For eject:
  Ejects a deployed package into a local directory, stitching its deployment import map into the current import map.
  The --dir flag is required to specify the output directory.
`
    )
    .action(
      wrapCommand((action, target, flags) => {
        switch (action) {
          case "publish": {
            const directory = target;
            return publish(directory, flags);
          }
          case "eject": {
            const packageName = target;
            return eject(packageName, flags);
          }
          default:
            throw new JspmError(
              `Unknown deploy action: ${action}\nValid actions are: publish, eject`
            );
        }
      })
    )
);

// The eject command has been moved to be a subcommand of deploy

export interface EjectFlags extends GenerateFlags {
  dir?: string;
}

export interface DeployFlags extends GenerateFlags {
  dir?: string;
  watch?: boolean;
  name?: string;
  version?: string;
  usage?: boolean;
}

// Using the interfaces from provider.ts for consistency
export interface ProviderFlags extends BaseFlags {
  provider?: string;
}

export interface ProviderAuthFlags extends BaseFlags {
  username?: string;
  open?: boolean;
}

// Provider command with subcommands
cli
  .command("provider <action> [provider]", "Manage package providers")
  .option(
    "-u, --username <username>",
    "Username for authentication (if required, for auth action)",
    {}
  )
  .option(
    "--no-open",
    "Disable automatically opening the authorization URL (for auth action)",
    {
      default: true,
    }
  )
  .example(
    (name) => `
$ ${name} provider auth jspm.io

Authenticate with the JSPM CDN provider.
`
  )
  .example(
    (name) => `
$ ${name} provider list

List all available providers and their authentication status.
`
  )
  .usage(
    `provider <action> [options]

Manages package providers for JSPM.

Actions:
  auth <provider>    Authenticate with a provider
  list               List available providers and their authentication status
`
  )
  .action(
    wrapCommand(
      async (
        action: string,
        providerName: string | undefined,
        flags: ProviderAuthFlags & ProviderFlags
      ) => {
        switch (action) {
          case "auth":
            if (!providerName) {
              throw new JspmError(
                "You must specify a provider to authenticate with. Try 'jspm provider auth jspm.io'"
              );
            }
            await provider.auth(providerName, flags);
            break;
          case "list":
            await provider.list(flags);
            break;
          default:
            throw new JspmError(
              `Unknown provider action: ${action}\nValid actions are: auth, list`
            );
        }
      }
    )
  );

// Taken from 'cac', as they don't export it:
interface HelpSection {
  title?: string;
  body: string;
}

// Wraps the CAC default help callback for more control over the output:
function defaultHelpCb(helpSections: HelpSection[]) {
  if (process.argv.includes("--version")) {
    process.stdout.write(version);
    return [];
  }

  for (const section of Object.values(helpSections)) {
    if (section.title === "Commands") {
      // The first command entry is the fallback command, which we _don't_
      // want to display on the help screen, as it's for throwing on invalid
      // commands:
      section.body = section.body.split("\n").slice(1).join("\n");
    }
  }

  for (const section of Object.values(helpSections)) {
    if (section.title) section.title = c.bold(section.title);
  }

  return helpSections;
}
