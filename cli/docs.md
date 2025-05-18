
The JSPM CLI is the main command-line import map package management tool for JSPM.

> For a complete guide and introduction to the JSPM CLI and import map package management, see the [getting started guide](/getting-started).

For import map generation API usage or in other environments, see the low-level [Generator API](/docs/generator/stable/) which is the internal import map package management and generation API which this CLI project wraps. The [Generator API documentation](/docs/generator/stable/) also provides a more thorough details of the operations.

## Installation

The following command installs JSPM globally:

```
npm install -g jspm
```

# Commands

For a full list of commands and supported options, run `jspm --help`. For help with a specific command, add the `-h` or `--help` flag to the command invocation.

By default, JSPM operates on `importmap.json` which is automatically created if it does not exist. This is considered the main import map on which link and install operations are being performed, and can be customized with the `--map` option.

## init

### Usage
  
```
jspm init [directory] [options]
```    
    Initializes a JSPM project in the current or specified directory.
    

### Options
* `-q, --quiet`                   Quiet output (default: false)
* `-d, --dir` _&lt;directory&gt;_         Package directory to operate on (defaults to working directory) 
* `--disable-warning` _&lt;warnings&gt;_  Disable specific warnings (comma-separated list, e.g. file-count) 
* `-h, --help`                    Display this help (add --all for extended command list) 

### Examples


```
jspm init
```
Initialize a project in the current directory, creating package.json if needed.



```
jspm init ./my-project
```
Initialize a project in the ./my-project directory.

## ls

### Usage
  
```
jspm ls [package] [options]
```
Lists all available exports for a specified package or the current project.

When run without arguments:
- Lists exports for the current project from package.json
- Shows how the exports map to actual files in the project directory

When run with a package name:
- Lists all available exports for the specified package
- If a version is not specified, the latest version will be used
- This helps discover what subpaths are available for a package

By default, output is limited to 20 items. Use --limit to see more items.

### Options
* `-f, --filter` _&lt;pattern&gt;_        Filter exports by pattern (case-insensitive substring match) 
* `-l, --limit` _&lt;number&gt;_          Limit the number of exports displayed (default: 20) 
* `-p, --provider` &lt;[providers](#providers)&gt;     Provider to use for package resolution. Available providers: jspm.io, nodemodules, deno, jsdelivr, skypack, unpkg, esm.sh, jspm.io#system 
* `-q, --quiet`                   Quiet output (default: false)
* `-d, --dir` _&lt;directory&gt;_         Package directory to operate on (defaults to working directory) 
* `--disable-warning` _&lt;warnings&gt;_  Disable specific warnings (comma-separated list, e.g. file-count) 
* `-h, --help`                    Display this help (add --all for extended command list) 

### Examples


```
jspm ls
```
List all exports for the current project.



```
jspm ls react@18.2.0
```
List all exports for the React package version 18.2.0.



```
jspm ls lit@2.7.0 --filter server
```
List exports for the Lit package that contain "server" in their paths.



```
jspm ls lit@2.7.0 --limit 50
```
List up to 50 exports for the Lit package.



```
jspm ls lit@2.7.0 --provider unpkg
```
List exports for the Lit package using the unpkg provider explicitly.

## install

### Usage
  
```
jspm install [flags]
```
Installs the current package.json "exports" respecting constraints in "dependencies".
This creates an import map for the local project based on its exports.

Import Map Handling:
  - Install operations take an input import map and produce an output import map
  - Input map is controlled by --map flag (defaults to importmap.json or importmap.js)
  - --map can point to JSON, JS, or HTML files, and maps will be extracted appropriately
  - Maps behave like lockfiles; versions are locked to resolutions from the input map
  - Output map is controlled by --out flag, supporting the same file types:
    ΓÇó JSON: Just the import map
    ΓÇó JS: An import map injection script that can be included with a script tag (recommended)
    ΓÇó HTML: The import map is injected directly into the HTML file contents
  
Enhanced Security and Performance:
  - Use --integrity to add SRI (Subresource Integrity) hashes to the import map
  - Use --preload to generate preload link tags when using HTML output, improving load performance
  - Preload supports both "static" (explicit imports) and "dynamic" (conditional imports) modes

### Options
* `-m, --map` _&lt;file&gt;_                 File containing initial import map (defaults to importmap.json, supports .js with a JSON import map embedded, or HTML with an inline import map) 
* `-C, --conditions` &lt;[environments](#environments)&gt;  Comma-separated environment condition overrides (default: browser,development,module)
* `-r, --resolution` &lt;[resolutions](#resolutions)&gt;   Comma-separated dependency resolution overrides 
* `-p, --provider` &lt;[providers](#providers)&gt;        Default module provider. Available providers: jspm.io, nodemodules, deno, jsdelivr, skypack, unpkg, esm.sh, jspm.io#system 
* `--cache` _&lt;mode&gt;_                   Cache mode for fetches (online, offline, no-cache) (default: online)
* `--integrity`                      Add module integrity attributes to the import map (default: false)
* `--preload` _[mode]_                 Add module preloads to HTML output (default: static, dynamic) 
* `--root` _&lt;url&gt;_                     URL to treat as server root, i.e. rebase import maps against 
* `-f, --flatten-scopes`             Flatten import map scopes into smaller single top-level scope per origin (default: false)
* `-s, --combine-subpaths`           Combine import map subpaths under folder maps (ending in /) (default: false)
* `-c, --compact`                    Output a compact import map (default: false)
* `--stdout`                         Output the import map to stdout (default: false)
* `-o, --out` _&lt;file&gt;_                 File to inject the final import map into (default: --map / importmap.js). For JS files outputs an injection wrapper script, for JSON files, the import map only, and for HTML files embeds the import map. 
* `-q, --quiet`                      Quiet output (default: false)
* `-d, --dir` _&lt;directory&gt;_            Package directory to operate on (defaults to working directory) 
* `--disable-warning` _&lt;warnings&gt;_     Disable specific warnings (comma-separated list, e.g. file-count) 
* `-h, --help`                       Display this help (add --all for extended command list) 

### Examples
Install packages into the import map tracing the package.json "exports" entry points with "dependencies" constraints
  
```
jspm install
```
## serve

### Usage
  
```
jspm serve [directory] [options]
```    
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


### Options
* `-p, --port` _&lt;number&gt;_              Port to run the server on (default: 5776)
* `--no-type-stripping`              Disable TypeScript type stripping (serve .ts files as is) (default: true)
* `--no-watch`                       Disable watcher hot reloading (default: true)
* `--no-install`                     Disable automatic import map installs in watch mode (default: true)
* `-m, --map` _&lt;file&gt;_                 File containing initial import map (defaults to importmap.json, supports .js with a JSON import map embedded, or HTML with an inline import map) 
* `-C, --conditions` &lt;[environments](#environments)&gt;  Comma-separated environment condition overrides (default: browser,development,module)
* `-r, --resolution` &lt;[resolutions](#resolutions)&gt;   Comma-separated dependency resolution overrides 
* `-p, --provider` &lt;[providers](#providers)&gt;        Default module provider. Available providers: jspm.io, nodemodules, deno, jsdelivr, skypack, unpkg, esm.sh, jspm.io#system 
* `--cache` _&lt;mode&gt;_                   Cache mode for fetches (online, offline, no-cache) (default: online)
* `--integrity`                      Add module integrity attributes to the import map (default: false)
* `--preload` _[mode]_                 Add module preloads to HTML output (default: static, dynamic) 
* `--root` _&lt;url&gt;_                     URL to treat as server root, i.e. rebase import maps against 
* `-f, --flatten-scopes`             Flatten import map scopes into smaller single top-level scope per origin (default: false)
* `-s, --combine-subpaths`           Combine import map subpaths under folder maps (ending in /) (default: false)
* `-c, --compact`                    Output a compact import map (default: false)
* `--stdout`                         Output the import map to stdout (default: false)
* `-o, --out` _&lt;file&gt;_                 File to inject the final import map into (default: --map / importmap.js). For JS files outputs an injection wrapper script, for JSON files, the import map only, and for HTML files embeds the import map. 
* `-q, --quiet`                      Quiet output (default: false)
* `-d, --dir` _&lt;directory&gt;_            Package directory to operate on (defaults to working directory) 
* `--disable-warning` _&lt;warnings&gt;_     Disable specific warnings (comma-separated list, e.g. file-count) 
* `-h, --help`                       Display this help (add --all for extended command list) 

### Examples


```
jspm serve
```    
Start a server for the current directory on port 5776.



```
jspm serve ./dist --port 8080
```    
Start a server for the ./dist directory on port 8080.



```
jspm serve --map importmap.json
```    
Start a server that uses importmap.json as the import map.



```
jspm serve --no-watch --no-install --no-type-stripping
```    
Start a server that does not generate the import map on startup, perform type stripping or provide a hot reload watcher

## build

### Usage
  
```
jspm build [options]
```
Builds a package and its dependencies using the JSPM import map and dependency resolution.
Uses RollupJS under the hood to create optimized bundles.

By default the package entry points as defined in the package.json "exports" field
are built.


### Options
* `--no-minify`                      Disable build minification (default: true)
* `-o, --out` _&lt;dir&gt;_                  Path to the output directory for the build (default: dist)
* `-m, --map` _&lt;file&gt;_                 File containing initial import map (defaults to importmap.json, supports .js with a JSON import map embedded, or HTML with an inline import map) 
* `-C, --conditions` &lt;[environments](#environments)&gt;  Comma-separated environment condition overrides (default: browser,production,module)
* `-r, --resolution` &lt;[resolutions](#resolutions)&gt;   Comma-separated dependency resolution overrides 
* `-p, --provider` &lt;[providers](#providers)&gt;        Default module provider. Available providers: jspm.io, nodemodules, deno, jsdelivr, skypack, unpkg, esm.sh, jspm.io#system 
* `--cache` _&lt;mode&gt;_                   Cache mode for fetches (online, offline, no-cache) (default: online)
* `-q, --quiet`                      Quiet output (default: false)
* `-d, --dir` _&lt;directory&gt;_            Package directory to operate on (defaults to working directory) 
* `--disable-warning` _&lt;warnings&gt;_     Disable specific warnings (comma-separated list, e.g. file-count) 
* `-h, --help`                       Display this help (add --all for extended command list) 
## deploy

### Usage
  
```
jspm deploy [options]
```
Manages deployments to the JSPM CDN.

For publishing (default):
  jspm deploy

  The package must have a valid package.json with name and version fields.
  The package.json "files" and "ignore" arrays will be respected.
  Semver versions are always immutable deployments that cannot be redeployed.
  Mutable versions supporting redeployment must only contain alphanumeric characters, hyphens, and underscores [a-zA-Z0-9_-].

For ejecting a published package:
  jspm deploy --eject <packagename@packageversion> --dir _&lt;directory&gt;_

  Ejects a deployed package into a local directory, stitching its deployment import map into the current import map.
  The --dir flag is required to specify the output directory when using --eject.


### Options
* `--no-usage`                       Disable printing the usage code snippet for the deployment (default: true)
* `-w, --watch`                      Watch for changes and redeploy (experimental) (default: false)
* `-n, --name` _&lt;name&gt;_                Publish with a custom name instead of the name from package.json 
* `--eject` _&lt;package&gt;_                Eject a deployed package instead of publishing 
* `-m, --map` _&lt;file&gt;_                 File containing initial import map (defaults to importmap.json, supports .js with a JSON import map embedded, or HTML with an inline import map) 
* `-C, --conditions` &lt;[environments](#environments)&gt;  Comma-separated environment condition overrides (default: browser,production,module)
* `-r, --resolution` &lt;[resolutions](#resolutions)&gt;   Comma-separated dependency resolution overrides 
* `-p, --provider` &lt;[providers](#providers)&gt;        Default module provider. Available providers: jspm.io, nodemodules, deno, jsdelivr, skypack, unpkg, esm.sh, jspm.io#system 
* `--cache` _&lt;mode&gt;_                   Cache mode for fetches (online, offline, no-cache) (default: online)
* `--integrity`                      Add module integrity attributes to the import map (default: false)
* `--preload` _[mode]_                 Add module preloads to HTML output (default: static, dynamic) 
* `--root` _&lt;url&gt;_                     URL to treat as server root, i.e. rebase import maps against 
* `-f, --flatten-scopes`             Flatten import map scopes into smaller single top-level scope per origin (default: true)
* `-s, --combine-subpaths`           Combine import map subpaths under folder maps (ending in /) (default: true)
* `-c, --compact`                    Output a compact import map (default: false)
* `--stdout`                         Output the import map to stdout (default: false)
* `-o, --out` _&lt;file&gt;_                 File to inject the final import map into (default: --map / importmap.js). For JS files outputs an injection wrapper script, for JSON files, the import map only, and for HTML files embeds the import map. 
* `-q, --quiet`                      Quiet output (default: false)
* `-d, --dir` _&lt;directory&gt;_            Package directory to operate on (defaults to working directory) 
* `--disable-warning` _&lt;warnings&gt;_     Disable specific warnings (comma-separated list, e.g. file-count) 
* `-h, --help`                       Display this help (add --all for extended command list) 

### Examples


```
jspm deploy
```
Deploy the current directory as a package to the JSPM CDN.



```
jspm deploy --dir dist
```
Deploy the ./dist directory as a package to the JSPM CDN.



```
jspm deploy --dir dist --version dev-feat-2 --watch
```
Start a watched deployment to a custom mutable version tag (dev-feat-2) instead of the version from package.json.



```
jspm deploy --eject app:foo@bar --dir foo
```
Download the application package foo@bar into the folder foo, merging its import map into importmap.js.



```
jspm deploy --eject app:foo@bar --dir foo -o test.html
```
Download the application package foo@bar into the folder foo, merging its import map into the provided HTML file.

## auth

### Usage
  
```
jspm auth [provider] [options]
```
Manages authentication for JSPM providers.

### Usage
  jspm auth              List all available providers and their authentication status
  jspm auth &lt;[providers](#providers)&gt;   Authenticate with a specific provider


### Options
* `-u, --username` _&lt;username&gt;_     Username for authentication (if required) 
* `--no-open`                     Disable automatically opening the authorization URL (default: true)
* `-q, --quiet`                   Quiet output (default: false)
* `-d, --dir` _&lt;directory&gt;_         Package directory to operate on (defaults to working directory) 
* `--disable-warning` _&lt;warnings&gt;_  Disable specific warnings (comma-separated list, e.g. file-count) 
* `-h, --help`                    Display this help (add --all for extended command list) 

### Examples


```
jspm auth jspm.io
```
Authenticate with the JSPM CDN provider.



```
jspm auth
```
List all available providers and their authentication status.

## clear-cache

### Usage
  
```
jspm clear-cache
```
Clears the global module fetch cache, for situations where the contents of a dependency may have changed without a version bump. This can happen during local development, for instance.

### Options
* `-q, --quiet`                   Quiet output (default: false)
* `-d, --dir` _&lt;directory&gt;_         Package directory to operate on (defaults to working directory) 
* `--disable-warning` _&lt;warnings&gt;_  Disable specific warnings (comma-separated list, e.g. file-count) 
* `-h, --help`                    Display this help (add --all for extended command list) 

# Configuration

## Environments

Environments allow for configuring the conditional resolutions (ie [conditional exports](https://nodejs.org/dist/latest-v19.x/docs/api/packages.html#conditional-exports) and imports) for resolved packages.

The default environments for all operations are `development`, `browser` and `module`.

To configure different environments, you can provide one or more `-e` or `--env` flags with additional environment names to resolve. Environments like `development` and `production` are _modal_, meaning that setting one will override the other. To disable the default `browser` or `module` environments, you can set the `no-browser` or `no-module` environments respectively.

The environments used to generate a particular import map are recorded in the resulting map, so specifying the environments for a series of operations is only necessary for the first one.

### Examples

Compareing the import maps for `axios` in a browser environment (the default), and a non-browser environment:

```
diff <(jspm i axios --stdout) <(jspm i axios -e no-browser --stdout)
```

```
[...]
<       "#lib/adapters/http.js": "https://ga.jspm.io/npm:@jspm/core@2.0.1/nodelibs/@empty.js",
<       "#lib/platform/node/classes/FormData.js": "https://ga.jspm.io/npm:@jspm/core@2.0.1/nodelibs/@empty.js",
<       "#lib/platform/node/index.js": "https://ga.jspm.io/npm:@jspm/core@2.0.1/nodelibs/@empty.js"
---
>       "#lib/": "https://ga.jspm.io/npm:axios@1.3.4/lib/",
[...]
```

## Providers

Providers are used to resolve package _canonical names_ (such as `npm:react@18.2.0`) to _resolved URLs_ (such as [https://ga.jspm.io/npm:react@18.2.0/](https://ga.jspm.io/npm:react@18.2.0/package.json)). The default provider for all operations is `jspm.io`, which uses the [jspm.io](https://jspm.io) CDN for package resolutions. To configure a different provider, you can provide a `-p` or `--provider` flag.

The following providers are supported:

- `jspm.io`
- `jspm.io#system`
- `nodemodules`
- `esm.sh`
- `unpkg`
- `jsdelivr`

Most of these providers will resolve against their corresponding CDNs. For instance, `esm.sh` uses the [esm.sh](https://esm.sh) CDN, `unpkg` uses the [UNPKG](https://unpkg.com) CDN, and so on.

The `jspm.io#system` provider also uses the [jspm.io](https://jspm.io) CDN, but the resolved packages use the [SystemJS](https://github.com/systemjs/systemjs) module format rather than [ESM](https://nodejs.org/api/esm.html).

The `nodemodules` provider resolves packages against the local `node_modules` folder, allowing you to generate import maps for local development. This will only work in the browser if all dependencies are ESM dependencies.

### Examples

```
jspm install -p nodemodules lit
```

Installs `lit` into the import map using the `nodemodules` provider, which maps packges against the local `node_modules` directory. Note that this will fail unless `lit` and its dependencies have already been installed locally with `npm`. The resulting import map looks like this:

```json
{
  "env": ["browser", "development", "module"],
  "imports": {
    "lit": "./node_modules/lit/index.js"
  },
  "scopes": {
    "./node_modules/": {
      "@lit/reactive-element": "./node_modules/@lit/reactive-element/development/reactive-element.js",
      "lit-element/lit-element.js": "./node_modules/lit-element/development/lit-element.js",
      "lit-html": "./node_modules/lit-html/development/lit-html.js",
      "lit-html/is-server.js": "./node_modules/lit-html/development/is-server.js"
    }
  }
}
```

## Resolutions

Resolutions are used to remap package _names_ to particular package _targets_. For instance, the latest version of one of your secondary dependencies may be broken, and you want to pin it to an older version, or even to a different package altogether. To do this, you can provide one or more `-r` or `--resolution` flags, with arguments `[package_name]=[target_version]` or `[package_name]=[registry]:[name]@[target-range]`. Package specifiers can take the full syntax described under [`jspm install`](#jspm-install).

When a resolution is set, _all_ dependencies on that package will take the given remapping, no matter what the the resolution context is. Note that this may cause packages to break in unexpected ways if you violate their dependency constraints.

### Examples

```
  jspm install react@latest -r react=npm:preact@10.13.2
```

Installs `npm:preact@10.13.2` into the import map under the name `react`. Note that this will happen even though we have specified a particular version for `react`. The resulting import map looks like this:

```json
{
  "env": ["browser", "development", "module"],
  "imports": {
    "react": "https://ga.jspm.io/npm:preact@10.13.2/dist/preact.module.js"
  }
}
```

### Build

The build command can be used to build a project from the import map, which will include all dependencies by resolving them from CDN against the import map.

The command operates in two modes,

```sh
jspm build ./app.js --output dir
```

Uses default rollup configuration and builds the project with the importmap.

If you would like to use a custom rollup configuration, you can use the `--build-config` flag.

```sh
jspm build --config rollup.config.mjs
```

## Preload Tags and Integrity Attributes

It is always recommended to generate modulepreload tags for production apps using import maps. This avoids the latency waterfall for dependency discovery by inlining preload hints for all statically loaded modules upfront.

In addition, preload tags can also include [integrity attributes](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) for static dependency integrity.

When performing HTML injection operations (ie when the `--output` import map is an HTML file), `--preload` and `--integrity` can be used to handle this injection automatically.

