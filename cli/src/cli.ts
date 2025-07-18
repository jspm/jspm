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

/**
 * @module jspm
 *
 * JSPM CLI is a command-line tool for package management using import maps.
 * It provides commands for installing, linking, updating, building, and publishing
 * JavaScript/TypeScript packages using standard ES modules.
 *
 * The CLI supports various workflows including:
 * - Import map generation and manipulation
 * - Development server with live reloading
 * - Package building and optimization
 *
 * For a complete guide to all commands and options, see the
 * {@link https://jspm.org/docs/cli JSPM CLI documentation}.
 */

import { readFileSync } from 'node:fs';
import c from 'picocolors';
import cac, { type Command } from 'cac';
import clearCache from './clearCache.ts';
import install from './install.ts';
import link from './link.ts';
import update from './update.ts';
import configCmd from './config-cmd.ts';
import { JspmError, availableProviders, wrapCommand } from './utils.ts';
import build from './build.ts';
import { eject, publish } from './publish.ts';
import * as auth from './auth.ts';
import serve from './serve.ts';
import ls from './ls.ts';
import { initCreate } from './init.ts';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

/** @ignore */
export const cli = (cac as any)(c.yellow('jspm'));

type OptionGroup = (input: Command, production?: boolean) => Command;

const generateOpts: OptionGroup = (cac, release = false) =>
  cac
    .option(
      '-m, --map <file>',
      'File containing initial import map (defaults to importmap.json, supports .js with a JSON import map embedded, or HTML with an inline import map)',
      {}
    )
    .option('-C, --conditions <environments>', 'Comma-separated environment condition overrides', {
      default: []
    })
    .option('-r, --resolution <resolutions>', 'Comma-separated dependency resolution overrides', {})
    .option(
      '-p, --provider <provider>',
      `Default module provider. Available providers: ${availableProviders.join(', ')}`,
      {}
    )
    .option('--cache <mode>', 'Cache mode for fetches (online, offline, no-cache)', {
      default: 'online'
    })
    .option(
      '--release',
      'Enable release mode (--flatten-scopes, --combine-subpaths, --C=production)',
      {
        default: release
      }
    );

/**
 * Flags for all import map generation commands, internally used by the JSPM Generator
 * when generating the import map.
 *
 * Applies to:
 * - {@link https://jspm.org/docs/cli/#install jspm install}
 * - {@link https://jspm.org/docs/cli/#link jspm link}
 * - {@link https://jspm.org/docs/cli/#update jspm update}
 * - {@link https://jspm.org/docs/cli/#serve jspm serve}
 * - {@link https://jspm.org/docs/cli/#build jspm build}
 * - {@link https://jspm.org/docs/cli/#publish jspm publish}
 */
export interface GenerateFlags extends BaseFlags {
  /**
   * File containing initial import map (defaults to importmap.json,
   * supports .js with embedded JSON, or HTML with inline import map)
   */
  map?: string;
  /**
   * Comma-separated environment condition overrides or array of conditions
   * (defaults to ['browser', 'development', 'module'] in normal mode,
   * or ['browser', 'production', 'module'] in production mode)
   */
  conditions?: string | string[];
  /**
   * Comma-separated dependency resolution overrides or array of resolutions
   * (no default, used to override specific package versions)
   */
  resolution?: string | string[];
  /**
   * Default module provider to use (e.g., 'jspm.io', 'unpkg', 'jsdelivr', etc.)
   * (defaults to user's configured defaultProvider or 'jspm.io')
   */
  provider?: string;
  /**
   * Cache mode for fetches (defaults to 'online', accepts 'online', 'offline', 'no-cache')
   */
  cache?: string;
  /**
   * Enable release mode with production optimizations (defaults to false)
   * When enabled, automatically sets: --flatten-scopes, --combine-subpaths, --conditions=production
   */
  release?: boolean;
}

const outputOpts: OptionGroup = cac =>
  cac
    .option('--integrity', 'Add module integrity attributes to the import map', {})
    .option('--preload [mode]', 'Add module preloads to HTML output (default: static, dynamic)', {})
    .option('--root <url>', 'URL to treat as server root, i.e. rebase import maps against', {})
    .option(
      '-f, --flatten-scopes',
      'Flatten import map scopes into smaller single top-level scope per origin',
      {}
    )
    .option(
      '-s, --combine-subpaths',
      'Combine import map subpaths under folder maps (ending in /)',
      {}
    )
    .option('-c, --compact', 'Output a compact import map', { default: false })
    .option('--stdout', 'Output the import map to stdout', { default: false })
    .option(
      '-o, --out <file>',
      'File to inject the final import map into (default: --map / importmap.js). For JS files outputs an injection wrapper script, for JSON files, the import map only, and for HTML files embeds the import map.',
      {}
    );

/**
 * Flags for commands that generate import maps with output options.
 * Extends {@link GenerateFlags} with additional output formatting options.
 *
 * Applies to:
 * - {@link https://jspm.org/docs/cli/#install jspm install}
 * - {@link https://jspm.org/docs/cli/#link jspm link}
 * - {@link https://jspm.org/docs/cli/#update jspm update}
 * - {@link https://jspm.org/docs/cli/#serve jspm serve}
 * - {@link https://jspm.org/docs/cli/#publish jspm publish}
 */
export interface GenerateOutputFlags extends GenerateFlags {
  /** URL to treat as server root for rebasing import maps (defaults to current directory) */
  root?: string;
  /** Install mode for resolving dependencies (defaults to 'default') */
  installMode?: 'default' | 'latest-primaries' | 'latest-all' | 'freeze';
  /** Output a compact import map (defaults to false, true for production) */
  compact?: boolean;
  /** Output the import map to stdout (defaults to false) */
  stdout?: boolean;
  /** File to inject the final import map into (defaults to value of --map or importmap.js) */
  out?: string;
  /** Flatten import map scopes into smaller single top-level scope per origin (defaults to false, true for production) */
  flattenScopes?: boolean;
  /** Combine import map subpaths under folder maps (defaults to false, true for production) */
  combineSubpaths?: boolean;
  /** Add module preloads to HTML output (defaults to undefined, accepts 'static', 'dynamic') */
  preload?: boolean | string;
  /** Add module integrity attributes to the import map (defaults to false) */
  integrity?: boolean;
}

/**
 * Base flags available for all JSPM CLI commands.
 *
 * Provides common options like quiet mode and directory selection that
 * are available across all command implementations.
 */
export interface BaseFlags {
  /** Suppress non-essential output (defaults to false) */
  quiet?: boolean;
  /** Display version information (defaults to false) */
  showVersion?: boolean;
  /** Directory to operate in (defaults to current working directory) */
  dir?: string;
  /** Comma-separated list of warnings to disable (e.g., 'file-count') */
  disableWarning?: string[] | string;
}

cli
  .option('-q, --quiet', 'Quiet output', { default: false })
  .option(
    '-d, --dir <directory>',
    'Package directory to operate on (defaults to working directory)',
    {}
  )
  .option(
    '--disable-warning <warnings>',
    'Disable specific warnings (comma-separated list, e.g. file-count)',
    {}
  )
  .help(defaultHelpCb);

// Fallback command:
cli
  .command('[...args]')
  .allowUnknownOptions()
  .usage('[command] [options]')
  .action(
    wrapCommand(args => {
      if (args[0] === 'help') return cli.outputHelp();
      if (args[0] === '--version') {
        console.log(version);
        return;
      }
      if (!args.length) return cli.outputHelp();
      throw new JspmError(
        `Unknown command: ${args[0]}\nRun "jspm" without any arguments to see the help file.`
      );
    })
  );

// Initialize project command
cli
  .command('init [directory]', 'Initialize a new JSPM project')
  .usage(
    `init [directory] [options]

Initializes a JSPM project in the current or specified directory.
`
  )
  .example(
    name => `
$ ${name} init

Initialize a project in the current directory, creating package.json if needed.
`
  )
  .example(
    name => `
$ ${name} init ./my-project

Initialize a project in the ./my-project directory.
`
  )
  .action(initCreate);

cli
  .command('ls [package]', 'List package exports')
  .option(
    '-f, --filter <pattern>',
    'Filter exports by pattern (case-insensitive substring match)',
    {}
  )
  .option('-l, --limit <number>', 'Limit the number of exports displayed (default: 20)', {})
  .option(
    '-p, --provider <provider>',
    `Provider to use for package resolution. Available providers: ${availableProviders.join(', ')}`,
    {}
  )
  .example(
    name => `
$ ${name} ls

List all exports for the current project.
`
  )
  .example(
    name => `
$ ${name} ls react@18.2.0

List all exports for the React package version 18.2.0.
`
  )
  .example(
    name => `
$ ${name} ls lit@2.7.0 --filter server

List exports for the Lit package that contain "server" in their paths.
`
  )
  .example(
    name => `
$ ${name} ls lit@2.7.0 --limit 50

List up to 50 exports for the Lit package.
`
  )
  .example(
    name => `
$ ${name} ls lit@2.7.0 --provider unpkg

List exports for the Lit package using the unpkg provider explicitly.
`
  )
  .usage(
    `ls [package] [options]

Lists all available exports for a specified package or the current project.

When run without arguments:
- Lists exports for the current project from package.json
- Shows how the exports map to actual files in the project directory

When run with a package name:
- Lists all available exports for the specified package
- If a version is not specified, the latest version will be used
- This helps discover what subpaths are available for a package

By default, output is limited to 20 items. Use --limit to see more items.`
  )
  .action(wrapCommand(ls));

outputOpts(generateOpts(cli.command('link [...modules]', 'Link modules').alias('trace')))
  .example(
    name => `Link a local module
  $ ${name} link ./src/cli.js
`
  )
  .example(
    name => `Link an HTML file and update its import map including preload and integrity tags
  $ ${name} link --map index.html --integrity --preload
`
  )
  .usage(
    `link [flags] [...modules]

Traces and installs all dependencies necessary to execute the given modules into an import map, including both static and dynamic module imports.

Input Types:
  - Paths to local JavaScript modules (e.g., "./src/my-module.mjs")
  - Paths to local HTML files (e.g., "index.html"), which links all module scripts in the file
  - Valid remote URLs, which also links their dependencies into the import map

Import Map Handling:
  - If no modules are given, all "imports" in the initial map are relinked
  - Takes an input import map (--map) and produces an updated output map (--out)
  - Works with the same map formats as install (JSON, JS, HTML)
  
Security and Performance Options:
  - Use --integrity to add SRI integrity hashes to the import map
  - Use --preload to generate preload link tags when using HTML output`
  )
  .action(wrapCommand(link));

outputOpts(generateOpts(cli.command('install', 'Install local package exports (i)').alias('i')))
  .example(
    name => `Install packages into the import map tracing the package.json "exports" entry points with "dependencies" constraints
  $ ${name} install
`
  )
  .usage(
    `install [flags]

Installs the current package.json "exports" respecting constraints in "dependencies".
This creates an import map for the local project based on its exports.

Import Map Handling:
  - Install operations take an input import map and produce an output import map
  - Input map is controlled by --map flag (defaults to importmap.json or importmap.js)
  - --map can point to JSON, JS, or HTML files, and maps will be extracted appropriately
  - Maps behave like lockfiles; versions are locked to resolutions from the input map
  - Output map is controlled by --out flag, supporting the same file types:
    - JSON: Just the import map
    - JS: An import map injection script that can be included with a script tag (recommended)
    - HTML: The import map is injected directly into the HTML file contents
  
Enhanced Security and Performance:
  - Use --integrity to add SRI (Subresource Integrity) hashes to the import map
  - Use --preload to generate preload link tags when using HTML output, improving load performance
  - Preload supports both "static" (explicit imports) and "dynamic" (conditional imports) modes`
  )
  .action(wrapCommand(install));

outputOpts(generateOpts(cli.command('update [...packages]', 'Update packages').alias('upgrade')))
  .example(
    name => `
$ ${name} update react-dom

Update the react-dom package.
`
  )
  .usage(
    `update [flags] [...packages]

Updates packages in an import map to the latest versions that are compatible with the local "package.json". The given packages must be valid package specifiers, such as "npm:react@18.0.0", "denoland:oak" or "lit", and must be present in the initial import map.

Import Map Handling:
  - Takes an input import map (--map) and produces an updated output map (--out)
  - Only specified packages are updated; all other mappings remain unchanged
  - Works with the same map formats as install (JSON, JS, HTML)
  - If no packages are specified, attempts to update all top-level imports`
  )
  .action(wrapCommand(update));

/**
 * Flags for the config command to manage JSPM configuration.
 *
 * Used by the {@link https://jspm.org/docs/cli/#config jspm config} command
 * to manipulate user and project-level configuration settings.
 */
export interface ConfigFlags extends BaseFlags {
  /** Use local project configuration instead of user-level (defaults to false) */
  local?: boolean;
  /** Provider to configure (for provider-specific configuration, no default) */
  provider?: string;
}

outputOpts(
  generateOpts(
    cli
      .command('serve', 'Start a local development server')
      .option('-p, --port <number>', 'Port to run the server on', {
        default: 5776
      })
      .option('--no-type-stripping', 'Disable TypeScript type stripping (serve .ts files as is)', {
        default: true
      })
      .option(
        '--static',
        'Disable hot reloading and auto installation, providing a static server only',
        {
          default: false
        }
      )
      .option('--no-install', 'Disable automatic import map installs in watch mode', {
        default: true
      })
  )
)
  .example(
    name => `
$ ${name} serve
    
Start a server for the current directory on port 5776.
`
  )
  .example(
    name => `
$ ${name} serve ./dist --port 8080
    
Start a server for the ./dist directory on port 8080.
`
  )
  .example(
    name => `
$ ${name} serve --map importmap.json
    
Start a server that uses importmap.json as the import map.
`
  )
  .example(
    name => `
$ ${name} serve --static
    
Start a server that does not generate the import map on startup, perform type stripping or provide a hot reload watcher
`
  )
  .usage(
    `serve [directory] [options]
    
Starts a standards-based development server for the specified directory. If no directory is specified,
the current directory is used. The server provides directory listings and serves files with
appropriate MIME types.

This is an intentionally minimal, opinionated server focused on standards-based workflows:
  - Applications are served directly from the root (http://localhost:5776/...)
  - TypeScript support with type-only stripping (no transpilation of JSX or other non-standard syntax)
  - Native ES modules only (no bundling or transformation)
  - Import maps for dependency management

Key features:
  - Serves applications directly from the root path
  - TypeScript type stripping (disable with --no-type-stripping if you prefer to use tsc)
  - Live reload capabilities
  - Full support for import map generation options via -m/--map
  - Support for automatic import map updates
  - Default port 5776 (override with --port)
  - Standards-based serving with minimal modifications to source files

When in watch mode, any file changes trigger automatic page reloads.
For non-standard syntax like JSX, use a separate compilation step before serving.

The server will automatically update the import map on changes using the JSPM generator with
the same options as the 'jspm install' command with no arguments.
`
  )
  .action(wrapCommand(serve));

generateOpts(
  outputOpts(
    cli
      .command('build', 'Build package')
      .option('--no-minify', 'Disable build minification', {
        default: true
      })
      .option('-o, --out <dir>', 'Path to the output directory for the build', {
        default: 'dist'
      })
      .option('--install', 'Generate import map after build completes', {
        default: true
      }),
    true
  )
)
  .example(
    name => `
$ ${name} build

Build the current package using default options.
`
  )
  .example(
    name => `
$ ${name} build --no-minify

Build the package without minification for better debugging.
`
  )
  .example(
    name => `
$ ${name} build -o lib

Build the package to the lib directory instead of the default dist directory.
`
  )
  .example(
    name => `
$ ${name} build --map custom-map.json

Build using a custom import map file.
`
  )
  .usage(
    `build [options]

Builds a package and its dependencies using the JSPM import map and dependency resolution.
Uses RollupJS under the hood to create optimized bundles.

The package entry points as defined in the package.json "exports" field are built, with the
entire package copied into the output directory. As such, it is a whole-package transformation.

Build externals are taken from the package.json "dependencies" to form a roughly configurationless
build workflow (dependencies in "devDependencies" or otherwise are inlined into the build).

Includes and ignores can be specified using the package.json "files" and "ignore" fields,
optionally using the JSPM overrides for these via the "jspm" property in the package.json.

Any build import map shoud be generated separately via a subsequent install operation on the
build folder, for example like:

${c.bold('jspm install -d dist -C production --flatten-scopes --combine-subpaths')}

to generate an optimized production map.
`
  )
  .action(wrapCommand(build));

/**
 * Flags for the build command to compile packages.
 *
 * Used by the {@link https://jspm.org/docs/cli/#build jspm build} command
 * to build and optimize packages using RollupJS.
 */
export interface BuildFlags extends GenerateFlags {
  /** Path to the output directory for the build (defaults to 'dist') */
  out?: string;
  /** Enable/disable build minification (defaults to true) */
  minify?: boolean;
  /** Generate import map after build completes (defaults to true) */
  install?: boolean;
}

// Publish command - main command is now just publish with --eject flag for eject functionality
outputOpts(
  generateOpts(
    cli
      .command('publish', `Publish package to a provider (experimental)`)
      .option(
        '--no-usage',
        'Disable printing HTML/JS import code examples after successful publish',
        {
          default: true
        }
      )
      .option('-w, --watch', 'Watch for changes and republish (experimental)', {
        default: false
      })
      .option(
        '-n, --name <name>',
        'Publish with a custom name instead of the name from package.json',
        {}
      )
      .option(
        '-v, --version <version>',
        'Publish with a custom version instead of the version from package.json',
        {}
      )
      .option('--eject <package>', 'Eject a published package instead of publishing', {}),
    true
  )
)
  .example(
    name => `
$ ${name} publish

Publish the current directory as a package to the JSPM CDN.
`
  )
  .example(
    name => `
$ ${name} publish -p jspm.io

Publish the current package as a package to the JSPM CDN.
`
  )
  .example(
    name => `
$ ${name} publish --dir dist --version dev-feat-2 --watch

Start a watched publish to a custom mutable version tag (dev-feat-2) instead of the version from package.json.
`
  )
  .example(
    name => `
$ ${name} publish --eject app:foo@bar --dir foo

Download the application package foo@bar into the folder foo, merging its import map into foo/importmap.js.
`
  )
  .example(
    name => `
$ ${name} publish --eject app:foo@bar --dir foo -o test.html

Download the application package foo@bar into the folder foo, merging its import map into the provided HTML file.
`
  )
  .usage(
    `publish [options]

Manages publishes to the JSPM providers, currently in experimental preview.

For publishing (default):

  jspm publish

  - The provider flag is always required, with limited signups only available on the jspm.io provider currently
  - The package must have a valid package.json with name and version fields.
  - The package.json "files" and "ignore" arrays will be respected.
  - Semver versions are always immutable publishes that cannot be republished.
  - Mutable versions supporting republishing must only contain alphanumeric characters, hyphens, and underscores [a-zA-Z0-9_-].

For ejecting a published package:

  jspm download --eject <packagename@packageversion> --dir <directory>

  - Ejects a published package into a local directory, stitching its published import map into the target import map.
  - The --dir flag is required to specify the output project directory when using --eject.
`
  )
  .action(
    wrapCommand(flags => {
      if (flags.eject) {
        if (!flags.dir) {
          throw new JspmError(
            'When using --eject, you must provide an explicit --dir flag to eject into'
          );
        }
        return eject(flags);
      } else {
        return publish(flags);
      }
    })
  );

// The eject command has been moved to be a subcommand of publish

/**
 * Flags for ejecting published packages.
 *
 * Used with {@link https://jspm.org/docs/cli/#publish jspm publish --eject}
 * to download published packages into local directories.
 */
export interface EjectFlags extends GenerateFlags {
  /** Package to eject in the format "[provider:]package[@version]" (required) */
  eject: string;
}

/**
 * Flags for publishing packages to providers.
 *
 * Used by the {@link https://jspm.org/docs/cli/#publish jspm publish} command
 * to publish packages to JSPM providers.
 */
export interface PublishFlags extends GenerateFlags {
  /** Watch for changes and republish (experimental, defaults to false) */
  watch?: boolean;
  /** Custom name to use instead of package.json name (defaults to name in package.json) */
  name?: string;
  /** Custom version to use instead of package.json version (defaults to version in package.json) */
  version?: string;
  /** Print HTML/JS import code examples after successful publish (defaults to true) */
  usage?: boolean;
  /** Eject a published package instead of publishing (defaults to false) */
  eject?: boolean;
}

/**
 * Flags for provider authentication commands.
 *
 * Used by the {@link https://jspm.org/docs/cli/#auth jspm auth} command
 * to authenticate with package providers.
 */
export interface AuthProviderFlags extends BaseFlags {
  /** Username for authentication (if required by the provider, no default) */
  username?: string;
  /** Automatically open the authorization URL in a browser (defaults to true) */
  open?: boolean;
}

/**
 * Flags for the serve command to start a development server.
 *
 * Used by the {@link https://jspm.org/docs/cli/#serve jspm serve} command
 * to run a local development server with live reloading and TypeScript support.
 */
export interface ServeFlags extends GenerateOutputFlags {
  /** Port to run the server on (defaults to 5776) */
  port?: number;
  /** Enable/disable TypeScript type stripping (defaults to true) */
  typeStripping?: boolean;
  /** Disable file watching, auto installs and hot reloading (defaults to false) */
  static?: boolean;
  /** Enable/disable automatic import map installs in watch mode (defaults to true) */
  install?: boolean;
}

/**
 * Flags for the ls command to list package exports.
 *
 * Used by the {@link https://jspm.org/docs/cli/#ls jspm ls} command
 * to discover and list available package exports.
 */
export interface LsFlags extends BaseFlags {
  /** Filter exports by pattern (case-insensitive substring match, no default) */
  filter?: string;
  /** Limit the number of exports displayed (defaults to 20) */
  limit?: number | string;
  /** Provider to use for package resolution (defaults to configured defaultProvider) */
  provider?: string;
}

cli
  .command('config <action> [key] [value]', 'Manage configuration')
  .option('--local', 'Use the local project configuration (default is user-level)', {
    default: false
  })
  .option(
    '-p, --provider <provider>',
    'Provider to configure (for provider-specific configuration)',
    {}
  )
  .example(
    name => `
$ ${name} config set -p npm auth "your-auth-token"

Set an authentication token for the npm provider in the user configuration.
`
  )
  .example(
    name => `
$ ${name} config set --provider jspm.io baseUrl "https://jspm.io/" --local

Set the base URL for a provider with dots in its name in the local project configuration.
`
  )
  .example(
    name => `
$ ${name} config get -p npm

Get the npm provider configuration.
`
  )
  .example(
    name => `
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

// Auth command for managing provider authentication
cli
  .command('auth [provider]', 'Manage provider authentication')
  .option('-u, --username <username>', 'Username for authentication (if required)', {})
  .option('--no-open', 'Disable automatically opening the authorization URL', {
    default: true
  })
  .example(
    name => `
$ ${name} auth jspm.io

Authenticate with the JSPM CDN provider.
`
  )
  .example(
    name => `
$ ${name} auth

List all available providers and their authentication status.
`
  )
  .usage(
    `auth [provider] [options]

Manages authentication for JSPM providers.

Usage:
  jspm auth              List all available providers and their authentication status
  jspm auth <provider>   Authenticate with a specific provider
`
  )
  .action(
    wrapCommand(async (provider: string | undefined, flags: AuthProviderFlags) => {
      if (!provider) {
        // If no provider specified, show the provider list
        await auth.list();
        return;
      }

      // Otherwise authenticate with the specified provider
      await auth.provider(provider, flags);
    })
  );

cli
  .command('clear-cache', 'Clear the package cache (cc)')
  .usage(
    `clear-cache

Clears the global module fetch cache, for situations where the contents of a dependency may have changed without a version bump. This can happen during local development, for instance.`
  )
  .alias('cc')
  .action(wrapCommand(clearCache));

// Taken from 'cac', as they don't export it:
interface HelpSection {
  title?: string;
  body: string;
}

// Wraps the CAC default help callback for more control over the output:
function defaultHelpCb(helpSections: HelpSection[]) {
  if (process.argv.includes('--version') || process.argv.includes('-v')) {
    process.stdout.write(version);
    return [];
  }

  helpSections[0].body = `\n${c.yellowBright('▣ ')}${c.bold(
    c.whiteBright(' JSPM ')
  )} -  ${c.whiteBright('Import Map Package Management')}`;

  for (const section of Object.values(helpSections)) {
    if (section.title?.startsWith('For more info')) {
      section.title = '';
      section.body = `${c.bold(
        `For more info on a specific command <cmd>, ${c.yellow('jspm <cmd> --help')} flag.`
      )}`;
    }

    if (section.title === 'Options') {
      section.body = section.body.replace(
        'Display this message',
        'Display this help (add --all for extended command list)'
      );
    }

    if (section.title === 'Commands') {
      // The first command entry is the fallback command, which we _don't_
      // want to display on the help screen, as it's for throwing on invalid
      // commands:
      section.body = section.body
        .split('\n')
        .slice(1)
        .filter(l => {
          if (process.argv.includes('--all')) return true;
          return !(
            l.includes('link') ||
            l.includes('config') ||
            l.includes('uninstall') ||
            l.includes('update') ||
            l.includes('auth') ||
            l.includes('clear-cache')
          );
        })
        .join('\n');
    }
  }

  for (const section of Object.values(helpSections)) {
    if (section.title) section.title = c.bold(section.title);
  }

  return helpSections;
}
