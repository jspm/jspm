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
import { eject, publish } from './deploy.ts';
import * as auth from './auth.ts';
import serve from './serve.ts';
import ls from './ls.ts';
import { initCreate } from './init.ts';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

export const cli = cac(c.yellow('jspm'));

type OptionGroup = (input: Command, production?: boolean) => Command;

const generateOpts: OptionGroup = (cac, production = false) =>
  cac
    .option(
      '-m, --map <file>',
      'File containing initial import map (defaults to importmap.json, supports .js with a JSON import map embedded, or HTML with an inline import map)',
      {}
    )
    .option('-C, --conditions <environments>', 'Comma-separated environment condition overrides', {
      default: production
        ? ['browser', 'production', 'module']
        : ['browser', 'development', 'module']
    })
    .option('-r, --resolution <resolutions>', 'Comma-separated dependency resolution overrides', {})
    .option(
      '-p, --provider <provider>',
      `Default module provider. Available providers: ${availableProviders.join(', ')}`,
      {}
    )
    .option('--cache <mode>', 'Cache mode for fetches (online, offline, no-cache)', {
      default: 'online'
    });

export interface GenerateFlags extends BaseFlags {
  map?: string;
  conditions?: string | string[];
  resolution?: string | string[];
  provider?: string;
  cache?: string;
}

const outputOpts: OptionGroup = (cac, production = false) =>
  cac
    .option('--integrity', 'Add module integrity attributes to the import map', { default: false })
    .option('--preload [mode]', 'Add module preloads to HTML output (default: static, dynamic)', {})
    .option('--root <url>', 'URL to treat as server root, i.e. rebase import maps against', {})
    .option(
      '-f, --flatten-scopes',
      'Flatten import map scopes into smaller single top-level scope per origin',
      {
        default: production
      }
    )
    .option(
      '-s, --combine-subpaths',
      'Combine import map subpaths under folder maps (ending in /)',
      {
        default: production
      }
    )
    .option('-c, --compact', 'Output a compact import map', { default: false })
    .option('--stdout', 'Output the import map to stdout', { default: false })
    .option(
      '-o, --out <file>',
      'File to inject the final import map into (default: --map / importmap.js). For JS files outputs an injection wrapper script, for JSON files, the import map only, and for HTML files embeds the import map.',
      {}
    );

export interface GenerateOutputFlags extends GenerateFlags {
  root?: string;
  installMode?: 'default' | 'latest-primaries' | 'latest-all' | 'freeze';
  compact?: boolean;
  stdout?: boolean;
  out?: string;
  flattenScopes?: boolean;
  combineSubpaths?: boolean;
  preload?: boolean | string;
  integrity?: boolean;
}

export interface BaseFlags {
  quiet?: boolean;
  showVersion?: boolean;
  dir?: string;
}

cli
  .option('-q, --quiet', 'Quiet output', { default: false })
  .option(
    '-d, --dir <directory>',
    'Package directory to operate on (defaults to working directory)',
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

outputOpts(generateOpts(cli.command('link [...modules]', 'link modules').alias('trace')))
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

Traces and installs all dependencies necessary to execute the given modules into an import map, including both static and dynamic module imports. The given modules can be:
  1. Paths to local JavaScript modules, such as "./src/my-module.mjs".
  2. Paths to local HTML files, such as "index.html", in which case all module scripts in the file are linked.
  3. Valid remote URLs, in which case their dependencies will be linked in turn into the import map.

If no modules are given, all "imports" in the initial map are relinked.`
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
    • JSON: Just the import map
    • JS: An import map injection script that can be included with a script tag (recommended)
    • HTML: The import map is injected directly into the HTML file contents
  
Enhanced Security and Performance:
  - Use --integrity to add SRI (Subresource Integrity) hashes to the import map
  - Use --preload to generate preload link tags when using HTML output, improving load performance
  - Preload supports both "static" (explicit imports) and "dynamic" (conditional imports) modes`
  )
  .action(wrapCommand(install));

outputOpts(generateOpts(cli.command('update [...packages]', 'update packages').alias('upgrade')))
  .example(
    name => `
$ ${name} update react-dom

Update the react-dom package.
`
  )
  .usage(
    `update [flags] [...packages]

Updates packages in an import map to the latest versions that are compatible with the local \`package.json\`. The given packages must be valid package specifiers, such as \`npm:react@18.0.0\`, \`denoland:oak\` or \`lit\`, and must be present in the initial import map.

Import Map Handling:
  - Takes an input import map (--map) and produces an updated output map (--out)
  - Only specified packages are updated; all other mappings remain unchanged
  - Works with the same map formats as install (JSON, JS, HTML)
  - If no packages are specified, attempts to update all top-level imports`
  )
  .action(wrapCommand(update));

export interface ConfigFlags extends BaseFlags {
  local?: boolean;
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
      .option('--no-watch', 'Disable watcher hot reloading', {
        default: true
      })
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
$ ${name} serve --no-watch --no-install --no-type-stripping
    
Start a server that does not generate the import map on startup, perform type stripping or provide a hot reload watcher
`
  )
  .usage(
    `serve [directory] [options]
    
Starts a standards-based development server for the specified directory. If no directory is specified, 
the current directory is used. The server provides directory listings and serves files with 
appropriate MIME types.

This is an intentionally minimal, opinionated server focused on standards-based workflows:
  - Applications are served under their package name (http://localhost:5776/myapp/...)
  - TypeScript support with type-only stripping (no transpilation of JSX or other non-standard syntax)
  - Native ES modules only (no bundling or transformation)
  - Import maps for dependency management

Key features:
  - Serves applications under their package name (derived from package.json)
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
  cli
    .command('build', 'Build package')
    .option('-o, --out <dir>', 'Path to the output directory for the build', {
      default: 'dist'
    }),
  true
)
  .usage(
    `build [options]

Builds a package and its dependencies using the JSPM import map and dependency resolution.
Uses RollupJS under the hood to create optimized bundles.

By default the package entry points as defined in the package.json "exports" field
are built.
`
  )
  .action(wrapCommand(build));

export interface BuildFlags extends BaseFlags {
  out?: string;
}

// Deploy command - main command is now just deploy with --eject flag for eject functionality
outputOpts(
  generateOpts(
    cli
      .command('deploy', `Deploy package to a provider (experimental)`)
      .option('--no-usage', 'Disable printing the usage code snippet for the deployment', {
        default: true
      })
      .option('-w, --watch', 'Watch for changes and redeploy (experimental)', {
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
      .option('--eject <package>', 'Eject a deployed package instead of publishing', {}),
    true
  ),
  true
)
  .example(
    name => `
$ ${name} deploy

Deploy the current directory as a package to the JSPM CDN.
`
  )
  .example(
    name => `
$ ${name} deploy --dir dist

Deploy the ./dist directory as a package to the JSPM CDN.
`
  )
  .example(
    name => `
$ ${name} deploy --dir dist --version dev-feat-2 --watch

Start a watched deployment to a custom mutable version tag (dev-feat-2) instead of the version from package.json.
`
  )
  .example(
    name => `
$ ${name} deploy --eject app:foo@bar --dir foo

Download the application package foo@bar into the folder foo, merging its import map into importmap.js.
`
  )
  .example(
    name => `
$ ${name} deploy --eject app:foo@bar --dir foo -o test.html

Download the application package foo@bar into the folder foo, merging its import map into the provided HTML file.
`
  )
  .usage(
    `deploy [options]

Manages deployments to the JSPM CDN.

For publishing (default):
  jspm deploy

  The package must have a valid package.json with name and version fields.
  The package.json "files" and "ignore" arrays will be respected.
  Semver versions are always immutable deployments that cannot be redeployed.
  Mutable versions supporting redeployment must only contain alphanumeric characters, hyphens, and underscores [a-zA-Z0-9_-].

For ejecting a published package:
  jspm deploy --eject <packagename@packageversion> --dir <directory>

  Ejects a deployed package into a local directory, stitching its deployment import map into the current import map.
  The --dir flag is required to specify the output directory when using --eject.
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

// The eject command has been moved to be a subcommand of deploy

export interface EjectFlags extends GenerateFlags {
  eject: string;
}

export interface DeployFlags extends GenerateFlags {
  watch?: boolean;
  name?: string;
  version?: string;
  usage?: boolean;
  eject?: boolean;
}

// Using the interfaces from provider.ts for consistency
export interface ProviderFlags extends BaseFlags {
  provider?: string;
}

export interface AuthProviderFlags extends BaseFlags {
  username?: string;
  open?: boolean;
}

export interface ServeFlags extends GenerateOutputFlags {
  port?: number;
  typeStripping?: boolean;
  watch?: boolean;
  install?: boolean;
}

export interface LsFlags extends BaseFlags {
  filter?: string;
  limit?: number | string;
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
