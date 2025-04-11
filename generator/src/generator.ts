/**
 * Copyright 2020-2023 Guy Bedford
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
 * The main entry point into the @jspm/generator package.
 * @module generator.ts
 */

import { baseUrl as _baseUrl, relativeUrl, resolveUrl } from "./common/url.js";
import {
  ExactModule,
  ExactPackage,
  PackageConfig,
  parseTarget,
  validatePkgName,
} from "./install/package.js";
import TraceMap from "./trace/tracemap.js";
// @ts-ignore
import {
  clearCache as clearFetchCache,
  fetch as _fetch,
  setFetch,
} from "./common/fetch.js";
import { IImportMap, ImportMap } from "@jspm/import-map";
import process from "process";
import { SemverRange } from "sver";
import { JspmError } from "./common/err.js";
import { getIntegrity } from "./common/integrity.js";
import { createLogger, Log, LogStream } from "./common/log.js";
import { Replacer } from "./common/str.js";
import { analyzeHtml } from "./html/analyze.js";
import { InstallTarget, type InstallMode } from "./install/installer.js";
import { LockResolutions } from "./install/lock.js";
import {
  configureProviders,
  getDefaultProviderStrings,
  type Provider,
} from "./providers/index.js";
import * as nodemodules from "./providers/nodemodules.js";
import { Resolver } from "./trace/resolver.js";
import { getMaybeWrapperUrl } from "./common/wrapper.js";
import { setRetryCount } from "./common/fetch-common.js";

export {
  // utility export
  analyzeHtml,
  // hook export
  setFetch,
};

// Type exports for users:
export { Provider };

/**
 * @interface GeneratorOptions.
 */
export interface GeneratorOptions {
  /**
   * The URL to use for resolutions without a parent context.
   *
   * Defaults to mapUrl or the process base URL.
   *
   * Also determines the default scoping base for the import map when flattening.
   */
  baseUrl?: URL | string;

  /**
   * The URL of the import map itself, used to construct relative import map URLs.
   *
   * Defaults to the base URL.
   *
   * The `mapUrl` is used in order to output relative URLs for modules located on the same
   * host as the import map.
   *
   * E.g. for `mapUrl: 'file:///path/to/project/map.importmap'`, installing local file packages
   * will be output as relative URLs to their file locations from the map location, since all URLs in an import
   * map are relative to the URL of the import map.
   */
  mapUrl?: URL | string;

  /**
   * The URL to treat as the root of the serving protocol of the
   * import map, used to construct absolute import map URLs.
   *
   * When set, `rootUrl` takes precendence over `mapUrl` and is used to normalize all import map URLs
   * as absolute paths against this URL.
   *
   * E.g. for `rootUrl: 'file:///path/to/project/public'`, any local module `public/local/mod.js` within the `public` folder
   * will be normalized to `/local/mod.js` in the output map.
   */
  rootUrl?: URL | string | null;

  /**
   * An authoritative initial import map.
   *
   * An initial import map to start with - can be from a previous
   * install or to provide custom mappings.
   */
  inputMap?: IImportMap;

  /**
   * The provider to use for top-level (i.e. root package) installs if there's no context in the inputMap. This can be used to set the provider for a new import map. To use a specific provider for an install, rather than relying on context, register an override using the 'providers' option.
   *
   * Supports: 'jspm.io' | 'jspm.io#system' | 'nodemodules' | 'skypack' | 'jsdelivr' | 'unpkg' | 'esm.sh';
   *
   * Providers are responsible for resolution from abstract package names and version ranges to exact URL locations.
   *
   * Providers resolve package names and semver ranges to exact CDN package URL paths using provider hooks.
   *
   * These hooks include version resolution and converting package versions into URLs and back again.
   *
   * See `src/providers/[name].ts` for how to define a custom provider.
   *
   * New providers can be provided via the `customProviders` option. PRs to merge in providers are welcome as well.
   */
  defaultProvider?: string;

  /**
   * The default registry to use when no registry is provided to an install.
   * Defaults to 'npm:'.
   *
   * Registries are separated from providers because multiple providers can serve
   * any public registry.
   *
   * Internally, the default providers for registries are handled by the providers object
   */
  defaultRegistry?: string;

  /**
   * The conditional environment resolutions to apply.
   *
   * The conditions passed to the `env` option are environment conditions, as [supported by Node.js](https://nodejs.org/dist/latest-v16.x/docs/api/packages.html#packages_conditions_definitions) in the package exports field.
   *
   * By default the `"default"`, `"require"` and `"import"` conditions are always supported regardless of what `env` conditions are provided.
   *
   * In addition the default conditions applied if no `env` option is set are `"browser"`, `"development"` and `"module"`.
   *
   * Webpack and RollupJS support a custom `"module"` condition as a bundler-specific solution to the [dual package hazard](https://nodejs.org/dist/latest-v16.x/docs/api/packages.html#packages_dual_package_hazard), which is by default included in the JSPM resolution as well although
   * can be turned off if needed.
   *
   * Note when providing custom conditions like setting `env: ["production"]` that the `"browser"` and `"module"` conditions still need to be
   * applied as well via `env: ["production", "browser", "module"]`. Ordering does not matter though.
   *
   * Any other custom condition strings can also be provided.
   */
  env?: string[];

  /**
   * Whether to use a local FS cache for fetched modules. Set to 'offline' to use the offline cache.
   *
   * By default a global fetch cache is maintained between runs on the file system.
   *
   * This caching can be disabled by setting `cache: false`.
   *
   * When running offline, setting `cache: 'offline'` will only use the local cache and not touch the network at all,
   * making fully offline workflows possible provided the modules have been seen before.
   */
  cache?: "offline" | boolean;

  /**
   * User-provided fetch options for fetching modules, eg check https://github.com/npm/make-fetch-happen#extra-options for Node.js fetch
   */
  fetchOptions?: Record<string, any>;

  /**
   * Custom provider definitions.
   *
   * When installing from a custom CDN it can be advisable to define a custom provider in order to be able to get version deduping against that CDN.
   *
   * Custom provider definitions define a provider name, and the provider instance consisting of three main hooks:
   *
   * * `pkgToUrl({ registry: string, name: string, version: string }, layer: string) -> String URL`: Returns the URL for a given exact package registry, name and version to use for this provider. If the provider is using layers, the `layer` string can be used to determine the URL layer (where the `defaultProvider: '[name].[layer]'` form is used to determine the layer, eg minified v unminified etc). It is important that package URLs always end in `/`, because packages must be treated as folders not files. An error will be thrown for package URLs returned not ending in `/`.
   * * `parsePkgUrl(url: string) -> { { registry: string, name: string, version: string }, layer: string } | undefined`: Defines the converse operation to `pkgToUrl`, converting back from a string URL
   * into the exact package registry, name and version, as well as the layer. Should always return `undefined` for unknown URLs as the first matching provider is treated as authoritative when dealing with
   * multi-provider installations.
   * * `resolveLatestTarget(target: { registry: string, name: string, range: SemverRange }, unstable: boolean, layer: string, parentUrl: string) -> Promise<{ registry: string, name: string, version: string } | null>`: Resolve the latest version to use for a given package target. `unstable` indicates that prerelease versions can be matched. The definition of `SemverRange` is as per the [sver package](https://www.npmjs.com/package/sver#semverrange). Returning `null` corresponds to a package not found error.
   *
   * The use of `pkgToUrl` and `parsePkgUrl` is what allows the JSPM Generator to dedupe package versions internally based on their unique internal identifier `[registry]:[name]@[version]` regardless of what CDN location is used. URLs that do not support `parsePkgUrl` can still be installed and used fine, they just do not participate in version deduping operations.
   *
   * @example
   * ```js
   * const unpkgUrl = 'https://unpkg.com/';
   * const exactPkgRegEx = /^((?:@[^/\\%@]+\/)?[^./\\%@][^/\\%@]*)@([^\/]+)(\/.*)?$/;
   *
   * const generator = new Generator({
   *   defaultProvider: 'custom',
   *   customProviders: {
   *     custom: {
   *       pkgToUrl ({ registry, name, version }) {
   *         return `${unpkgUrl}${name}@${version}/`;
   *       },
   *       parseUrlPkg (url) {
   *         if (url.startsWith(unpkgUrl)) {
   *           const [, name, version] = url.slice(unpkgUrl.length).match(exactPkgRegEx) || [];
   *           return { registry: 'npm', name, version };
   *         }
   *       },
   *       resolveLatestTarget ({ registry, name, range }, unstable, layer, parentUrl) {
   *         return { registry, name, version: '3.6.0' };
   *       }
   *     }
   *   }
   * });
   *
   * await generator.install('custom:jquery');
   * ```
   */
  customProviders?: Record<string, Provider>;

  /**
   * A map of custom scoped providers.
   *
   * The provider map allows setting custom providers for specific package names, package scopes or registries.
   * For example, an organization with private packages with names like `npmpackage` and `@orgscope/...` can define the custom providers to reference these from a custom source:
   *
   * ```js
   *   providers: {
   *     'npmpackage': 'nodemodules',
   *     '@orgscope': 'nodemodules',
   *     'npm:': 'nodemodules'
   *   }
   * ```
   *
   * Alternatively a custom provider can be referenced this way for eg private CDN / registry support.
   */
  providers?: Record<string, string>;

  /**
   * Custom dependency resolution overrides for all installs.
   *
   * The resolutions option allows configuring a specific dependency version to always be used overriding all version resolution
   * logic for that dependency for all nestings.
   *
   * It is a map from package name to package version target just like the package.json "dependencies" map, but that applies and overrides universally.
   *
   * @example
   * ```js
   * const generator = new Generator({
   *   resolutions: {
   *     dep: '1.2.3'
   *   }
   * });
   * ```
   *
   * It is also useful for local monorepo patterns where all local packages should be located locally.
   * When referencing local paths, the baseUrl configuration option is used as the URL parent.
   *
   * ```js
   * const generator = new Generator({
   *   mapUrl: new URL('./app.html', import.meta.url),
   *   baseUrl: new URL('../', import.meta.url),
   *   resolutions: {
   *     '@company/pkgA': `./pkgA`,
   *     '@company/pkgB': `./pkgB`
   *     '@company/pkgC': `./pkgC`
   *   }
   * })
   * ```
   *
   * All subpath and main resolution logic will follow the package.json definitions of the resolved package, unlike `inputMap`
   * which only maps specific specifiers.
   */
  resolutions?: Record<string, string>;

  /**
   * Allows ignoring certain module specifiers during the tracing process.
   * It can be useful, for example, when you provide an `inputMap`
   * that contains a mapping that can't be traced in current context,
   * but you know it will work in the context where the generated map
   * is going to be used.
   * ```js
   * const generator = new Generator({
   *   inputMap: {
   *       imports: {
   *           "react": "./my/own/react.js",
   *       }
   *   },
   *   ignore: ["react"]
   * });
   *
   * // Even though `@react-three/fiber@7` depends upon `react`,
   * // `generator` will not try to trace and resolve `react`,
   * // so the mapping provided in `inputMap` will end up in the resulting import map.
   * await generator.install("@react-three/fiber@7")
   * ```
   */
  ignore?: string[];

  /**
   * Lockfile data to use for resolutions
   */
  lock?: LockResolutions;

  /**
   * Support tracing CommonJS dependencies locally. This is necessary if you
   * are using the "nodemodules" provider and have CommonJS dependencies.
   * Disabled by default.
   */
  commonJS?: boolean;

  /**
   * Support tracing TypeScript dependencies when generating the import map.
   * Disabled by default.
   */
  typeScript?: boolean;

  /**
   * Support tracing SystemJS dependencies when generating the import map.
   * Disabled by default.
   */
  system?: boolean;

  /**
   * Whether to include "integrity" field in the import map
   */
  integrity?: boolean;

  /**
   * The number of fetch retries to attempt for request failures.
   * Defaults to 3.
   */
  fetchRetries?: number;

  /**
   * The same as the Node.js `--preserve-symlinks` flag, except it will apply
   * to both the main and the dependencies.
   * See https://nodejs.org/api/cli.html#--preserve-symlinks.
   * This is only supported for file: URLs.
   * Defaults to false, like Node.js.
   */
  preserveSymlinks?: boolean;

  /**
   * Provider configuration options
   *
   * @example
   * ```js
   * const generator = new Generator({
   *   mapUrl: import.meta.url,
   *   defaultProvider: "jspm.io",
   *   providerConfig: {
   *     "jspm.io": {
   *       cdnUrl: `https://jspm-mirror.com/`
   *     }
   *   }
   */
  providerConfig?: {
    [providerName: string]: any;
  };
}

export interface ModuleAnalysis {
  format:
    | "commonjs"
    | "esm"
    | "system"
    | "json"
    | "css"
    | "typescript"
    | "wasm";
  staticDeps: string[];
  dynamicDeps: string[];
  cjsLazyDeps: string[] | null;
}

export interface Install {
  target: string | InstallTarget;
  alias?: string;
  subpath?: "." | `./${string}`;
  subpaths?: ("." | `./${string}`)[];
}

/**
 * Supports clearing the global fetch cache in Node.js.
 *
 * Example:
 *
 * ```js
 * import { clearCache } from '@jspm/generator';
 * clearCache();
 * ```
 */
export function clearCache() {
  clearFetchCache();
}

/**
 * Generator.
 */
export class Generator {
  traceMap: TraceMap;
  baseUrl: URL;
  mapUrl: URL;
  rootUrl: URL | null;
  map: ImportMap;
  logStream: LogStream;
  log: Log;
  integrity: boolean;

  /**
   * Constructs a new Generator instance.
   *
   * For example:
   *
   * ```js
   * const generator = new Generator({
   *   mapUrl: import.meta.url,
   *   inputMap: {
   *     "imports": {
   *       "react": "https://cdn.skypack.dev/react"
   *     }
   *   },
   *   defaultProvider: 'jspm',
   *   defaultRegistry: 'npm',
   *   providers: {
   *     '@orgscope': 'nodemodules'
   *   },
   *   customProviders: {},
   *   env: ['production', 'browser'],
   *   cache: false,
   * });
   * ```
   * @param {GeneratorOptions} opts Configuration for the new generator instance.
   */
  constructor({
    baseUrl,
    mapUrl,
    rootUrl = undefined,
    inputMap = undefined,
    env = ["browser", "development", "module", "import"],
    defaultProvider,
    defaultRegistry = "npm",
    customProviders = undefined,
    providers,
    resolutions = {},
    cache = true,
    fetchOptions = {},
    ignore = [],
    commonJS = false,
    typeScript = false,
    system = false,
    integrity = false,
    fetchRetries,
    providerConfig = {},
    preserveSymlinks,
  }: GeneratorOptions = {}) {
    // Initialise the debug logger:
    const { log, logStream } = createLogger();
    this.log = log;
    this.logStream = logStream;
    if (process?.env?.JSPM_GENERATOR_LOG) {
      (async () => {
        for await (const { type, message } of this.logStream()) {
          console.log(`\x1b[1m${type}:\x1b[0m ${message}`);
        }
      })();
    }
    if (typeof preserveSymlinks !== "boolean")
      preserveSymlinks = typeof process?.versions?.node === "string";

    // Initialise the resource fetcher:
    let fetchOpts: Record<string, any> = {
      retry: 1,
      timeout: 10000,
      ...fetchOptions,
      headers: { "Accept-Encoding": "gzip, br" },
    };
    if (cache === "offline") fetchOpts.cache = "force-cache";
    else if (!cache) fetchOpts.cache = "no-store";

    // Default logic for the mapUrl, baseUrl and rootUrl:
    if (mapUrl && !baseUrl) {
      mapUrl = typeof mapUrl === "string" ? new URL(mapUrl, _baseUrl) : mapUrl;
      try {
        baseUrl = new URL("./", mapUrl);
      } catch {
        baseUrl = new URL(mapUrl + "/");
      }
    } else if (baseUrl && !mapUrl) {
      mapUrl = baseUrl;
    } else if (!mapUrl && !baseUrl) {
      baseUrl = mapUrl = _baseUrl;
    }
    this.baseUrl =
      typeof baseUrl === "string" ? new URL(baseUrl, _baseUrl) : baseUrl;
    if (!this.baseUrl.pathname.endsWith("/")) {
      this.baseUrl = new URL(this.baseUrl.href);
      this.baseUrl.pathname += "/";
    }
    this.mapUrl =
      typeof mapUrl === "string" ? new URL(mapUrl, this.baseUrl) : mapUrl;
    this.rootUrl =
      typeof rootUrl === "string"
        ? new URL(rootUrl, this.baseUrl)
        : rootUrl || null;
    if (this.rootUrl && !this.rootUrl.pathname.endsWith("/"))
      this.rootUrl.pathname += "/";
    if (!this.mapUrl.pathname.endsWith("/")) {
      try {
        this.mapUrl = new URL("./", this.mapUrl);
      } catch {
        this.mapUrl = new URL(this.mapUrl.href + "/");
      }
    }

    this.integrity = integrity;

    // Initialise the resolver:
    const resolver = new Resolver({
      env,
      log,
      fetchOpts,
      preserveSymlinks,
      traceCjs: commonJS,
      traceTs: typeScript,
      traceSystem: system,
    });
    if (customProviders) {
      for (const provider of Object.keys(customProviders)) {
        resolver.addCustomProvider(provider, customProviders[provider]);
      }
    }

    // The node_modules provider is special, because it needs to be rooted to
    // perform resolutions against the local node_modules directory:
    const nmProvider = nodemodules.createProvider(
      this.baseUrl.href,
      defaultProvider === "nodemodules"
    );
    resolver.addCustomProvider("nodemodules", nmProvider);

    // We make an attempt to auto-detect the default provider from the input
    // map, by picking the provider with the most owned URLs:
    defaultProvider = detectDefaultProvider(
      defaultProvider,
      inputMap,
      resolver
    );

    // Initialise the tracer:
    this.traceMap = new TraceMap(
      {
        mapUrl: this.mapUrl,
        rootUrl: this.rootUrl,
        baseUrl: this.baseUrl,
        defaultProvider,
        defaultRegistry,
        providers,
        ignore,
        resolutions,
        commonJS,
      },
      log,
      resolver
    );

    // Reconstruct constraints and locks from the input map:
    this.map = new ImportMap({ mapUrl: this.mapUrl, rootUrl: this.rootUrl });
    if (!integrity) this.map.integrity = {};
    if (inputMap) this.addMappings(inputMap);

    // Set the fetch retry count
    if (typeof fetchRetries === "number") setRetryCount(fetchRetries);

    configureProviders(providerConfig, resolver.providers);
  }

  /**
   * Add new custom mappings and lock resolutions to the input map
   * of the generator, which are then applied in subsequent installs.
   *
   * @param jsonOrHtml The mappings are parsed as a JSON data object or string, falling back to reading an inline import map from an HTML file.
   * @param mapUrl An optional URL for the map to handle relative resolutions, defaults to generator mapUrl.
   * @param rootUrl An optional root URL for the map to handle root resolutions, defaults to generator rootUrl.
   * @returns The list of modules pinned by this import map or HTML.
   */
  async addMappings(
    jsonOrHtml: string | IImportMap,
    mapUrl: string | URL = this.mapUrl,
    rootUrl: string | URL = this.rootUrl,
    preloads?: string[]
  ): Promise<string[]> {
    if (typeof mapUrl === "string") mapUrl = new URL(mapUrl, this.baseUrl);
    if (typeof rootUrl === "string") rootUrl = new URL(rootUrl, this.baseUrl);
    let htmlModules: string[] | undefined;
    if (typeof jsonOrHtml === "string") {
      try {
        jsonOrHtml = JSON.parse(jsonOrHtml) as IImportMap;
      } catch {
        const analysis = analyzeHtml(jsonOrHtml as string, mapUrl);
        jsonOrHtml = (analysis.map.json || {}) as IImportMap;
        preloads = (preloads || []).concat(
          analysis.preloads
            .map((preload) => preload.attrs.href?.value)
            .filter((x) => x)
        );
        htmlModules = [
          ...new Set([...analysis.staticImports, ...analysis.dynamicImports]),
        ];
      }
    }
    await this.traceMap.addInputMap(jsonOrHtml, mapUrl, rootUrl, preloads);
    return htmlModules || [...this.traceMap.pins];
  }

  /**
   * Retrieve the lockfile data from the installer
   */
  getLock(): LockResolutions {
    return JSON.parse(JSON.stringify(this.traceMap.installer.installs));
  }

  /**
   * Link a module, installing all dependencies necessary into the map
   * to support its execution including static and dynamic module imports.
   *
   * @param specifier Module or list of modules to link
   * @param parentUrl Optional parent URL
   */
  async link(
    specifier: string | string[],
    parentUrl?: string
  ): Promise<{ staticDeps: string[]; dynamicDeps: string[] }> {
    if (typeof specifier === "string") specifier = [specifier];
    let error = false;
    await this.traceMap.processInputMap;
    specifier = specifier.map((specifier) => specifier.replace(/\\/g, "/"));
    try {
      await Promise.all(
        specifier.map((specifier) =>
          this.traceMap.visit(
            specifier,
            {
              installMode: "freeze",
              toplevel: true,
            },
            parentUrl || this.baseUrl.href
          )
        )
      );
      for (const s of specifier) {
        if (!this.traceMap.pins.includes(s)) this.traceMap.pins.push(s);
      }
    } catch (e) {
      error = true;
      throw e;
    } finally {
      const { map, staticDeps, dynamicDeps } = await this.traceMap.extractMap(
        this.traceMap.pins,
        this.integrity
      );
      this.map = map;
      if (!error) return { staticDeps, dynamicDeps };
    }
  }

  /**
   * Links every imported module in the given HTML file, installing all
   * dependencies necessary to support its execution.
   *
   * @param html HTML to link
   * @param htmlUrl URL of the given HTML
   */
  async linkHtml(
    html: string | string[],
    htmlUrl?: string | URL
  ): Promise<string[]> {
    if (Array.isArray(html)) {
      const impts = await Promise.all(
        html.map((h) => this.linkHtml(h, htmlUrl))
      );
      return [...new Set(impts)].reduce((a, b) => a.concat(b), []);
    }

    let resolvedUrl: URL;
    if (htmlUrl) {
      if (typeof htmlUrl === "string") {
        resolvedUrl = new URL(resolveUrl(htmlUrl, this.mapUrl, this.rootUrl));
      } else {
        resolvedUrl = htmlUrl;
      }
    }

    const analysis = analyzeHtml(html, resolvedUrl);
    const impts = [
      ...new Set([...analysis.staticImports, ...analysis.dynamicImports]),
    ];
    await Promise.all(impts.map((impt) => this.link(impt, resolvedUrl?.href)));
    return impts;
  }

  /**
   * Inject the import map into the provided HTML source
   *
   * @param html HTML source to inject into
   * @param opts Injection options
   * @returns HTML source with import map injection
   */
  async htmlInject(
    html: string,
    {
      trace = false,
      pins = !trace,
      htmlUrl = this.mapUrl,
      rootUrl = this.rootUrl,
      preload = false,
      integrity = false,
      whitespace = true,
      esModuleShims = true,
      comment = true,
    }: {
      pins?: string[] | boolean;
      trace?: string[] | boolean;
      htmlUrl?: string | URL;
      rootUrl?: string | URL | null;
      preload?: boolean | "all" | "static";
      integrity?: boolean;
      whitespace?: boolean;
      esModuleShims?: string | boolean;
      comment?: boolean | string;
    } = {}
  ): Promise<string> {
    if (comment === true)
      comment =
        " Generated by @jspm/generator - https://github.com/jspm/generator ";
    if (typeof htmlUrl === "string") htmlUrl = new URL(htmlUrl);

    const analysis = analyzeHtml(html, htmlUrl);

    let modules =
      pins === true ? this.traceMap.pins : Array.isArray(pins) ? pins : [];
    if (trace) {
      const impts = await this.linkHtml(html, htmlUrl);
      modules = [...new Set([...modules, ...impts])];
    }

    try {
      var { map, staticDeps, dynamicDeps } = await this.extractMap(
        modules,
        htmlUrl,
        rootUrl,
        integrity
      );
    } catch (err) {
      // Most likely cause of a generation failure:
      err.message +=
        "\n\nIf you are linking locally against your node_modules folder, make sure that you have all the necessary dependencies installed.";
    }

    const preloadDeps =
      preload === "all"
        ? [...new Set([...staticDeps, ...dynamicDeps])]
        : staticDeps;

    const newlineTab = !whitespace
      ? analysis.newlineTab
      : analysis.newlineTab.includes("\n")
      ? analysis.newlineTab
      : "\n" + analysis.newlineTab;

    const replacer = new Replacer(html);

    let esms = "";
    if (esModuleShims) {
      let esmsPkg: ExactPackage;
      try {
        esmsPkg = await this.traceMap.resolver.resolveLatestTarget(
          {
            name: "es-module-shims",
            registry: "npm",
            ranges: [new SemverRange("*")],
            unstable: false,
          },
          this.traceMap.installer.defaultProvider,
          this.baseUrl.href
        );
      } catch (err) {
        // This usually happens because the user is trying to use their
        // node_modules as the provider but has not installed the shim:
        let errMsg = `Unable to resolve "es-module-shims@*" under current provider "${this.traceMap.installer.defaultProvider.provider}".`;
        if (
          this.traceMap.installer.defaultProvider.provider === "nodemodules"
        ) {
          errMsg += `\n\nJspm automatically injects a shim so that the import map in your HTML file will be usable by older browsers.\nYou may need to run "npm install es-module-shims" to install the shim if you want to link against your local node_modules folder.`;
        }
        errMsg += `\nTo disable the import maps polyfill injection, set esModuleShims: false.`;
        throw new JspmError(errMsg);
      }

      let esmsUrl =
        (await this.traceMap.resolver.pkgToUrl(
          esmsPkg,
          this.traceMap.installer.defaultProvider
        )) + "dist/es-module-shims.js";

      // detect esmsUrl as a wrapper URL
      esmsUrl = await getMaybeWrapperUrl(
        esmsUrl,
        this.traceMap.resolver.fetchOpts
      );

      if (htmlUrl || rootUrl)
        esmsUrl = relativeUrl(
          new URL(esmsUrl),
          new URL(rootUrl ?? htmlUrl),
          !!rootUrl
        );

      esms = `<script async src="${esmsUrl}" crossorigin="anonymous"${
        integrity
          ? ` integrity="${await getIntegrity(
              new Uint8Array(
                await (
                  await fetch(esmsUrl, this.traceMap.resolver.fetchOpts)
                ).arrayBuffer()
              )
            )}"`
          : ""
      }></script>${newlineTab}`;

      if (analysis.esModuleShims)
        replacer.remove(
          analysis.esModuleShims.start,
          analysis.esModuleShims.end,
          true
        );
    }

    for (const preload of analysis.preloads) {
      replacer.remove(preload.start, preload.end, true);
    }

    let preloads = "";
    if (preload && preloadDeps.length) {
      let first = true;
      for (let dep of preloadDeps.sort()) {
        if (first || whitespace) preloads += newlineTab;
        if (first) first = false;
        const url =
          rootUrl || htmlUrl
            ? relativeUrl(new URL(dep), new URL(rootUrl || htmlUrl), !!rootUrl)
            : dep;
        preloads += `<link rel="modulepreload" href="${url}"${
          integrity
            ? ` integrity="${await getIntegrity(
                new Uint8Array(
                  await (
                    await fetch(dep, this.traceMap.resolver.fetchOpts)
                  ).arrayBuffer()
                )
              )}"`
            : ""
        } />`;
      }
    }

    if (comment) {
      const existingComment = analysis.comments.find((c) =>
        replacer.source
          .slice(replacer.idx(c.start), replacer.idx(c.end))
          .includes(comment as string)
      );
      if (existingComment) {
        replacer.remove(existingComment.start, existingComment.end, true);
      }
    }

    replacer.replace(
      analysis.map.start,
      analysis.map.end,
      (comment ? "<!--" + comment + "-->" + newlineTab : "") +
        esms +
        '<script type="importmap">' +
        (whitespace ? newlineTab : "") +
        JSON.stringify(map, null, whitespace ? 2 : 0).replace(
          /\n/g,
          newlineTab
        ) +
        (whitespace ? newlineTab : "") +
        "</script>" +
        preloads +
        (analysis.map.newScript ? newlineTab : "")
    );

    return replacer.source;
  }

  /**
   * Install a package target into the import map, including all its dependency resolutions via tracing.
   *
   * @param install Package or list of packages to install into the import map.
   *
   * @example
   * ```js
   * // Install a new package into the import map
   * await generator.install('react-dom');
   *
   * // Install a package version and subpath into the import map (installs lit/decorators.js)
   * await generator.install('lit@2/decorators.js');
   *
   * // Install a package version to a custom alias
   * await generator.install({ alias: 'react16', target: 'react@16' });
   *
   * // Install a specific subpath of a package
   * await generator.install({ target: 'lit@2', subpath: './html.js' });
   *
   * // Install an export from a locally located package folder into the map
   * // The package.json is used to determine the exports and dependencies.
   * await generator.install({ alias: 'mypkg', target: './packages/local-pkg', subpath: './feature' });
   * ```
   */
  async install(
    install?: string | Install | (string | Install)[]
  ): Promise<void | { staticDeps: string[]; dynamicDeps: string[] }> {
    return this._install(install);
  }

  private async _install(
    install?: string | Install | (string | Install)[],
    mode?: InstallMode
  ): Promise<void | { staticDeps: string[]; dynamicDeps: string[] }> {
    // If there are no arguments, then we reinstall all the top-level locks:
    if (install === null || install === undefined) {
      await this.traceMap.processInputMap;

      // To match the behaviour of an argumentless `npm install`, we use
      // existing resolutions for everything unless it's out-of-range:
      mode ??= "default";

      return this._install(
        Object.entries(this.traceMap.installer.installs.primary).map(
          ([alias, target]) => {
            const pkgTarget =
              this.traceMap.installer.constraints.primary[alias];

            // Try to reinstall lock against constraints if possible, otherwise
            // reinstall it as a URL directly (which has the downside that it
            // won't have NPM versioning semantics):
            let newTarget: string | InstallTarget = target.installUrl;
            if (pkgTarget) {
              if (pkgTarget instanceof URL) {
                newTarget = pkgTarget.href;
              } else {
                newTarget = `${pkgTarget.registry}:${pkgTarget.name}`;
              }
            }

            return {
              alias,
              target: newTarget,
              subpath: target.installSubpath ?? undefined,
            } as Install;
          }
        ),
        mode
      );
    }

    // Split the case of multiple install subpaths into multiple installs
    // TODO: flatten all subpath installs here
    if (
      !Array.isArray(install) &&
      typeof install !== "string" &&
      install.subpaths !== undefined
    ) {
      install.subpaths.every((subpath) => {
        if (
          typeof subpath !== "string" ||
          (subpath !== "." && !subpath.startsWith("./"))
        )
          throw new Error(
            `Install subpath "${subpath}" must be equal to "." or start with "./".`
          );
      });
      return this._install(
        install.subpaths.map((subpath) => ({
          target: (install as Install).target,
          alias: (install as Install).alias,
          subpath,
        }))
      );
    }

    if (!Array.isArray(install)) install = [install];

    // Handle case of multiple install targets with at most one subpath:
    await this.traceMap.processInputMap; // don't race input processing

    const imports = await Promise.all(
      install.map(async (install) => {
        // Resolve input information to a target package:
        let alias, target, subpath;
        if (typeof install === "string" || typeof install.target === "string") {
          ({ alias, target, subpath } = await installToTarget.call(
            this,
            install,
            this.traceMap.installer.defaultRegistry
          ));
        } else {
          ({ alias, target, subpath } = install);
          validatePkgName(alias);
        }

        this.log(
          "generator/install",
          `Adding primary constraint for ${alias}: ${JSON.stringify(target)}`
        );

        // By default, an install takes the latest compatible version for primary
        // dependencies, and existing in-range versions for secondaries:
        mode ??= "latest-primaries";

        await this.traceMap.add(alias, target, mode);

        return alias + (subpath ? subpath.slice(1) : "");
      })
    );

    await Promise.all(
      imports.map(async (impt) => {
        await this.traceMap.visit(
          impt,
          {
            installMode: mode,
            toplevel: true,
          },
          this.mapUrl.href
        );

        // Add the target import as a top-level pin
        // we do this after the trace, so failed installs don't pollute the map
        if (!this.traceMap.pins.includes(impt)) this.traceMap.pins.push(impt);
      })
    );

    const { map, staticDeps, dynamicDeps } = await this.traceMap.extractMap(
      this.traceMap.pins,
      this.integrity
    );
    this.map = map;
    return { staticDeps, dynamicDeps };
  }

  /**
   * Locking install, retraces all top-level pins but does not change the
   * versions of anything (similar to "npm ci").
   */
  async reinstall() {
    await this.traceMap.processInputMap;
    const { map, staticDeps, dynamicDeps } = await this.traceMap.extractMap(
      this.traceMap.pins,
      this.integrity
    );
    this.map = map;
    return { staticDeps, dynamicDeps };
  }

  /**
   * Updates the versions of the given packages to the latest versions
   * compatible with their parent's package.json ranges. If no packages are
   * given then all the top-level packages in the "imports" field of the
   * initial import map are updated.
   *
   * @param {string | string[]} pkgNames Package name or list of package names to update.
   */
  async update(pkgNames?: string | string[]) {
    if (typeof pkgNames === "string") pkgNames = [pkgNames];
    await this.traceMap.processInputMap;

    const primaryResolutions = this.traceMap.installer.installs.primary;
    const primaryConstraints = this.traceMap.installer.constraints.primary;

    // Matching the behaviour of "npm update":
    let mode: InstallMode = "latest-primaries";
    if (!pkgNames) {
      pkgNames = Object.keys(primaryResolutions);
      mode = "latest-all";
    }

    const installs: Install[] = [];
    for (const name of pkgNames) {
      const resolution = primaryResolutions[name];
      if (!resolution) {
        throw new JspmError(
          `No "imports" package entry for "${name}" to update. Note update takes package names not package specifiers.`
        );
      }
      const { installUrl, installSubpath } = resolution;
      const subpaths = this.traceMap.pins
        .filter(
          (pin) =>
            pin === name || (pin.startsWith(name) && pin[name.length] === "/")
        )
        .map((pin) => `.${pin.slice(name.length)}` as "." | `./${string}`);
      // use package.json range if present
      if (primaryConstraints[name]) {
        installs.push({
          alias: name,
          subpaths,
          target: { pkgTarget: primaryConstraints[name], installSubpath },
        });
      }
      // otherwise synthetize a range from the current package version
      else {
        const pkg = await this.traceMap.resolver.parseUrlPkg(installUrl);
        if (!pkg)
          throw new Error(
            `Unable to determine a package version lookup for ${name}. Make sure it is supported as a provider package.`
          );
        const target = {
          pkgTarget: {
            registry: pkg.pkg.registry,
            name: pkg.pkg.name,
            ranges: [new SemverRange("^" + pkg.pkg.version)],
            unstable: false,
          },
          installSubpath,
        };
        installs.push({ alias: name, subpaths, target });
      }
    }

    await this._install(installs, mode);
    const { map, staticDeps, dynamicDeps } = await this.traceMap.extractMap(
      this.traceMap.pins,
      this.integrity
    );
    this.map = map;
    return { staticDeps, dynamicDeps };
  }

  async uninstall(names: string | string[]) {
    if (typeof names === "string") names = [names];
    await this.traceMap.processInputMap;
    let pins = this.traceMap.pins;
    const unusedNames = new Set([...names]);
    for (let i = 0; i < pins.length; i++) {
      const pin = pins[i];
      const pinNames = names.filter(
        (name) => name === pin || (name.endsWith("/") && pin.startsWith(name))
      );
      if (pinNames.length) {
        pins.splice(i--, 1);
        for (const name of pinNames) unusedNames.delete(name);
      }
    }
    if (unusedNames.size) {
      throw new JspmError(
        `No "imports" entry for "${[...unusedNames][0]}" to uninstall.`
      );
    }
    this.traceMap.pins = pins;
    const { staticDeps, dynamicDeps, map } = await this.traceMap.extractMap(
      this.traceMap.pins,
      this.integrity
    );
    this.map = map;
    return { staticDeps, dynamicDeps };
  }

  async extractMap(
    pins: string | string[],
    mapUrl?: URL | string,
    rootUrl?: URL | string | null,
    integrity?: boolean
  ) {
    if (typeof mapUrl === "string") mapUrl = new URL(mapUrl, this.baseUrl);
    if (typeof rootUrl === "string") rootUrl = new URL(rootUrl, this.baseUrl);
    if (!Array.isArray(pins)) pins = [pins];
    if (typeof integrity !== "boolean") integrity = this.integrity;
    await this.traceMap.processInputMap;
    const { map, staticDeps, dynamicDeps } = await this.traceMap.extractMap(
      pins,
      integrity
    );
    map.rebase(mapUrl, rootUrl);
    map.flatten();
    map.sort();
    map.combineSubpaths();
    return { map: map.toJSON(), staticDeps, dynamicDeps };
  }

  /**
   * Resolve a specifier using the import map.
   *
   * @param specifier Module to resolve
   * @param parentUrl ParentURL of module to resolve
   * @returns Resolved URL string
   */
  resolve(specifier: string, parentUrl: URL | string = this.baseUrl) {
    if (typeof parentUrl === "string")
      parentUrl = new URL(parentUrl, this.baseUrl);
    const resolved = this.map.resolve(specifier, parentUrl);
    if (resolved === null)
      throw new JspmError(
        `Unable to resolve "${specifier}" from ${parentUrl.href}`,
        "MODULE_NOT_FOUND"
      );
    return resolved;
  }

  get importMap() {
    return this.map;
  }

  getAnalysis(url: string | URL): ModuleAnalysis {
    if (typeof url !== "string") url = url.href;
    const trace = this.traceMap.resolver.getAnalysis(url);
    if (!trace)
      throw new Error(
        `The URL ${url} has not been traced by this generator instance.`
      );
    return {
      format: trace.format,
      staticDeps: trace.deps,
      dynamicDeps: trace.dynamicDeps,
      cjsLazyDeps: trace.cjsLazyDeps || [],
    };
  }

  getMap(mapUrl?: string | URL, rootUrl?: string | URL | null) {
    const map = this.map.clone();
    map.rebase(mapUrl, rootUrl);
    map.flatten();
    map.sort();
    map.combineSubpaths();
    return map.toJSON();
  }
}

export interface LookupOptions {
  provider?: string;
  cache?: "offline" | boolean;
}

/**
 * _Use the internal fetch implementation, useful for hooking into the same shared local fetch cache._
 *
 * ```js
 * import { fetch } from '@jspm/generator';
 *
 * const res = await fetch(url);
 * console.log(await res.text());
 * ```
 *
 * Use the `{ cache: 'no-store' }` option to disable the cache, and the `{ cache: 'force-cache' }` option to enforce the offline cache.
 */
export async function fetch(url: string, opts: any = {}) {
  // @ts-ignore
  return _fetch(url, opts);
}

/**
 * Get the lookup resolution information for a specific install.
 *
 * @param install The install object
 * @param lookupOptions Provider and cache defaults for lookup
 * @returns The resolved install and exact package \{ install, resolved \}
 */
export async function lookup(
  install: string | Install,
  { provider, cache }: LookupOptions = {}
) {
  const generator = new Generator({ cache: !cache, defaultProvider: provider });
  const { target, subpath, alias } = await installToTarget.call(
    generator,
    install,
    generator.traceMap.installer.defaultRegistry
  );
  if (typeof target === "string")
    throw new Error(
      `Resolved install "${install}" to package specifier ${target}, but expected a fully qualified install target.`
    );

  const { pkgTarget, installSubpath } = target;
  if (pkgTarget instanceof URL) throw new Error("URL lookups not supported");
  const resolved = await generator.traceMap.resolver.resolveLatestTarget(
    pkgTarget,
    generator.traceMap.installer.getProvider(pkgTarget),
    generator.baseUrl.href
  );
  return {
    install: {
      target: {
        registry: pkgTarget.registry,
        name: pkgTarget.name,
        range: pkgTarget.ranges.map((range) => range.toString()).join(" || "),
      },
      installSubpath,
      subpath,
      alias,
    },
    resolved: resolved,
  };
}

/**
 * Get the package.json configuration for a specific URL or package.
 *
 * @param pkg Package to lookup configuration for
 * @param lookupOptions Optional provider and cache defaults for lookup
 * @returns Package JSON configuration
 *
 * Example:
 * ```js
 * import { getPackageConfig } from '@jspm/generator';
 *
 * // Supports a resolved package
 * {
 *   const packageJson = await getPackageConfig({ registry: 'npm', name: 'lit-element', version: '2.5.1' });
 * }
 *
 * // Or alternatively provide any URL
 * {
 *   const packageJson = await getPackageConfig('https://ga.jspm.io/npm:lit-element@2.5.1/lit-element.js');
 * }
 * ```
 */
export async function getPackageConfig(
  pkg: string | URL | ExactPackage,
  { provider, cache }: LookupOptions = {}
): Promise<PackageConfig | null> {
  const generator = new Generator({ cache: !cache, defaultProvider: provider });
  if (typeof pkg === "object" && "name" in pkg)
    pkg = await generator.traceMap.resolver.pkgToUrl(
      pkg,
      generator.traceMap.installer.defaultProvider
    );
  else if (typeof pkg === "string") pkg = new URL(pkg).href;
  else pkg = pkg.href;
  return generator.traceMap.resolver.getPackageConfig(pkg);
}

/**
 * Get the package base URL for the given module URL.
 *
 * @param url module URL
 * @param lookupOptions Optional provider and cache defaults for lookup
 * @returns Base package URL
 *
 * Modules can be remote CDN URLs or local file:/// URLs.
 *
 * All modules in JSPM are resolved as within a package boundary, which is the
 * parent path of the package containing a package.json file.
 *
 * For JSPM CDN this will always be the base of the package as defined by the
 * JSPM CDN provider. For non-provider-defined origins it is always determined
 * by trying to fetch the package.json in each parent path until the root is reached
 * or one is found. On file:/// URLs this exactly matches the Node.js resolution
 * algorithm boundary lookup.
 *
 * This package.json file controls the package name, imports resolution, dependency
 * resolutions and other package information.
 *
 * getPackageBase will return the folder containing the package.json,
 * with a trailing '/'.
 *
 * This URL will either be the root URL of the origin, or it will be a
 * path "pkgBase" such that fetch(`${pkgBase}package.json`) is an existing
 * package.json file.
 *
 * @example
 * ```js
 *   import { getPackageBase } from '@jspm/generator';
 *   const pkgUrl = await getPackageBase('https://ga.jspm.io/npm:lit-element@2.5.1/lit-element.js');
 *   // Returns: https://ga.jspm.io/npm:lit-element@2.5.1/
 * ```
 */
export async function getPackageBase(
  url: string | URL,
  { provider, cache }: LookupOptions = {}
): Promise<string> {
  const generator = new Generator({ cache: !cache, defaultProvider: provider });
  return generator.traceMap.resolver.getPackageBase(
    typeof url === "string" ? url : url.href
  );
}

/**
 * Get the package metadata for the given module or package URL.
 *
 * @param url URL of a module or package for a configured provider.
 * @param lookupOptions Optional provider and cache defaults for lookup.
 * @returns Package metadata for the given URL if one of the configured
 *          providers owns it, else null.
 *
 * The returned metadata will always contain the package name, version and
 * registry, along with the provider name and layer that handles resolution
 * for the given URL.
 */
export async function parseUrlPkg(
  url: string | URL,
  { provider, cache }: LookupOptions = {}
): Promise<ExactModule | null> {
  const generator = new Generator({ cache: !cache, defaultProvider: provider });
  return generator.traceMap.resolver.parseUrlPkg(
    typeof url === "string" ? url : url.href
  );
}

/**
 * Returns a list of providers that are supported by default.
 *
 * @returns List of valid provider strings supported by default.
 *
 * To use one of these providers, pass the string to either the "defaultProvider"
 * option or the "providers" mapping when constructing a Generator.
 */
export function getDefaultProviders(): string[] {
  return getDefaultProviderStrings();
}

async function installToTarget(
  this: Generator,
  install: Install | string,
  defaultRegistry: string
): Promise<Install> {
  if (typeof install === "string") install = { target: install };
  if (typeof install.target !== "string")
    throw new Error('All installs require a "target" string.');
  if (
    install.subpath !== undefined &&
    (typeof install.subpath !== "string" ||
      (install.subpath !== "." && !install.subpath.startsWith("./")))
  )
    throw new Error(
      `Install subpath "${
        install.subpath
      }" must be a string equal to "." or starting with "./".${
        typeof install.subpath === "string"
          ? `\nTry setting the subpath to "./${install.subpath}"`
          : ""
      }`
    );

  const { alias, target, subpath } = await parseTarget(
    this.traceMap.resolver,
    install.target as string,
    this.baseUrl,
    defaultRegistry
  );

  return {
    target,
    alias: install.alias || alias,
    subpath: install.subpath || subpath,
  };
}

function detectDefaultProvider(
  defaultProvider: string | null,
  inputMap: IImportMap | null,
  resolver: Resolver
) {
  // We only use top-level install information to detect the provider:
  const counts: Record<string, number> = {};
  for (const url of Object.values(inputMap?.imports || {})) {
    const name = resolver.providerNameForUrl(url);
    if (name) {
      counts[name] = (counts[name] || 0) + 1;
    }
  }

  let winner: string | null;
  let winnerCount = 0;
  for (const [name, count] of Object.entries(counts)) {
    if (count > winnerCount) {
      winner = name;
      winnerCount = count;
    }
  }

  // TODO: this should be the behaviour once we support full 'providers' opt
  // The leading provider in the input map takes precedence as the provider of
  // the root package. Failing that, the user-provided default is used. The
  // 'providers' field can be used for hard-overriding this:
  // return winner || defaultProvider || "jspm.io";

  return defaultProvider || winner || "jspm.io";
}
