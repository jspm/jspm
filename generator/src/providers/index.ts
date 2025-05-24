import * as deno from './deno.js';
import * as jspm from './jspm.js';
import * as skypack from './skypack.js';
import * as jsdelivr from './jsdelivr.js';
import * as unpkg from './unpkg.js';
import * as node from './node.js';
import * as esmsh from './esmsh.js';
import {
  PackageConfig,
  ExactPackage,
  LatestPackageTarget,
  PackageTarget
} from '../install/package.js';
import { Resolver } from '../trace/resolver.js';
import { Install } from '../generator.js';
import { JspmError } from '../common/err.js';
import { Log } from '../common/log.js';
import { PackageProvider } from '../install/installer.js';
import type { ImportMap } from '@jspm/import-map';
import { isNode } from '../common/env.js';
import { fetch } from '../common/fetch.js';

export interface Provider {
  parseUrlPkg(
    this: ProviderContext,
    url: string
  ): ExactPackage | { pkg: ExactPackage; subpath: `./${string}` | null; layer: string } | null;

  pkgToUrl(this: ProviderContext, pkg: ExactPackage, layer?: string): Promise<`${string}/`>;

  resolveLatestTarget(
    this: ProviderContext,
    target: LatestPackageTarget,
    layer: string,
    parentUrl: string,
    resolver: Resolver // TODO: deprecate or formalize this
  ): Promise<ExactPackage | null>;

  ownsUrl?(this: ProviderContext, url: string): boolean;

  resolveBuiltin?(this: ProviderContext, specifier: string, env: string[]): string | Install | null;

  getPackageConfig?(this: ProviderContext, pkgUrl: string): Promise<PackageConfig | null>;

  getFileList?(this: ProviderContext, pkgUrl: string): Promise<Set<string> | undefined>;

  download?(this: ProviderContext, pkg: ExactPackage): Promise<Record<string, ArrayBuffer>>;

  /**
   * Publish a package to the provider
   * This is an optional method that providers can implement to support package publishing
   *
   * @param importMap Optional import map to include with the publish
   */
  publish?(
    this: ProviderContext,
    pkg: ExactPackage,
    files: Record<string, string | ArrayBuffer> | undefined,
    importMap: ImportMap | undefined,
    imports: string[]
  ): Promise<PublishOutput>;

  /**
   * Authenticate with the provider
   * This is an optional method that providers can implement to support authentication
   *
   * @param username Optional username for authentication
   * @param verify Optional callback to verify authentication with the user
   * @returns A promise resolving to an authentication token
   */
  auth?(
    this: ProviderContext,
    options: {
      username?: string;
      verify?: (url: string, instructions: string) => void;
    }
  ): Promise<{ token: string }>;

  supportedLayers?: string[];

  configure?(this: ProviderContext, config: any): void;
}

/**
 * Context provided to all provider methods
 * Contains necessary services and configuration
 */
export class ProviderContext {
  /**
   * Logger instance for provider operations
   */
  log: Log;

  /**
   * Fetch options for provider operations
   */
  fetchOpts: any;

  /**
   * Custom context object for providers
   */
  context: any;

  #pm: ProviderManager;

  constructor(pm: ProviderManager, log: Log, fetchOpts: any) {
    this.#pm = pm;
    this.log = log;
    this.fetchOpts = fetchOpts;
    this.context = {};
  }
}

/**
 * Provider manager to handle provider registration, lookup and operations
 */
export class ProviderManager {
  log: Log;
  fetchOpts: any;
  providers: Record<string, Provider>;
  contexts: Record<string, ProviderContext>;

  /**
   * Create a new ProviderManager with the given providers
   *
   * @param customProviders Custom provider definitions to add
   */
  constructor(
    log: Log,
    fetchOpts: any,
    providerConfig: Record<string, any> = {},
    customProviders: Record<string, Provider> = {}
  ) {
    this.log = log;
    this.fetchOpts = fetchOpts;
    this.contexts = {};
    this.providers = { ...defaultProviders };

    for (const [name, provider] of Object.entries(customProviders)) {
      this.addProvider(name, provider);
    }

    this.#configure(providerConfig);
  }

  #getProviderContext(name: string) {
    return (
      this.contexts[name] ||
      (this.contexts[name] = new ProviderContext(this, this.log, this.fetchOpts))
    );
  }

  /**
   * Add a custom provider to this provider manager
   *
   * @param name Name of the provider
   * @param provider Provider implementation
   */
  addProvider(name: string, provider: Provider): void {
    if (!provider.pkgToUrl)
      throw new Error(`Custom provider "${name}" must define a "pkgToUrl" method.`);
    if (!provider.parseUrlPkg)
      throw new Error(`Custom provider "${name}" must define a "parseUrlPkg" method.`);
    if (!provider.resolveLatestTarget)
      throw new Error(`Custom provider "${name}" must define a "resolveLatestTarget" method.`);
    this.providers[name] = provider;
  }

  /**
   * Get a provider by name
   *
   * @param name Name of the provider
   * @returns The provider instance
   */
  #getProvider(name: string): Provider {
    const provider = this.providers[name];
    if (provider) return provider;
    throw new JspmError(`No provider named "${name}" has been defined.`);
  }

  /**
   * Find the provider name for a given URL
   *
   * @param url URL to find the provider for
   * @returns The name of the provider, or null if no provider handles this URL
   */
  providerNameForUrl(url: string): string | null {
    for (const name of Object.keys(this.providers).reverse()) {
      const provider = this.providers[name];
      const context = this.#getProviderContext(name);
      if (
        (provider.ownsUrl && provider.ownsUrl.call(context, url)) ||
        provider.parseUrlPkg.call(context, url)
      ) {
        return name;
      }
    }
    return null;
  }

  /**
   * Parse a URL to get package information
   *
   * @param url URL to parse
   * @returns Package information or null if URL can't be parsed
   */
  async parseUrlPkg(url: string): Promise<{
    pkg: ExactPackage;
    source: { provider: string; layer: string };
    subpath: `./${string}` | null;
  } | null> {
    for (const provider of Object.keys(this.providers).reverse()) {
      const providerInstance = this.providers[provider];
      const context = this.#getProviderContext(provider);
      const result = providerInstance.parseUrlPkg.call(context, url);
      if (result)
        return {
          pkg: 'pkg' in result ? result.pkg : result,
          source: {
            provider,
            layer: 'layer' in result ? result.layer : 'default'
          },
          subpath: 'subpath' in result ? result.subpath : null
        };
    }
    return null;
  }

  /**
   * Convert a package to a URL
   *
   * @param pkg Package to convert
   * @param provider Provider name
   * @param layer Layer to use
   * @returns URL for the package
   */
  async pkgToUrl(pkg: ExactPackage, provider: string, layer = 'default'): Promise<`${string}/`> {
    return this.#getProvider(provider).pkgToUrl.call(
      this.#getProviderContext(provider),
      pkg,
      layer
    );
  }

  /**
   * Get the package config corresponding to a package URL
   *
   * @param pkgUrl URL to the package
   * @returns
   */
  async getPackageConfig(pkgUrl: string): Promise<PackageConfig | null | undefined> {
    const name = this.providerNameForUrl(pkgUrl);
    if (name) {
      const pcfg = await this.#getProvider(name).getPackageConfig?.call(
        this.#getProviderContext(name),
        pkgUrl
      );
      return pcfg || null;
    }
  }

  /**
   * Obtain a file listing of a package boundary if available
   */
  async getFileList(pkgUrl: string): Promise<Set<string> | undefined> {
    if (!pkgUrl.endsWith('/')) pkgUrl += '/';
    const name = this.providerNameForUrl(pkgUrl);
    if (name) {
      const fileList = await this.#getProvider(name).getFileList?.call(
        this.#getProviderContext(name),
        pkgUrl
      );
      return fileList || undefined;
    }
    // if we don't have a provider, and we are on the local filesystem, verify there
    // is a package.json and do a glob excluding node_modules
    if ((isNode && pkgUrl.startsWith('file:')) || pkgUrl.startsWith('https:')) {
      const fileList = new Set<string>();
      async function walk(path: string, basePath: string) {
        try {
          const res = await fetch(path);

          if (res.status === 200) {
            fileList.add(path.slice(basePath.length));
          } else if (res.status === 204) {
            if (!path.endsWith('/')) path += '/';
            const dirListing = await res.json();
            for (const entry of dirListing) {
              if (entry === 'node_modules' || entry === '.git') continue;
              await walk(path + entry, basePath);
            }
          }
        } catch (e) {
          throw new JspmError(`Unable to read package ${path} - ${e.toString()}`);
        }
      }
      await walk(pkgUrl, pkgUrl);
      return fileList;
    }
  }

  /**
   * Resolve a builtin module
   *
   * @param specifier Module specifier
   * @returns Resolved string, install object, or undefined if not resolvable
   */
  resolveBuiltin(specifier: string, env: string[]): string | Install | undefined {
    for (const [name, provider] of Object.entries(this.providers).reverse()) {
      if (!provider.resolveBuiltin) continue;
      const context = this.#getProviderContext(name);
      const builtin = provider.resolveBuiltin.call(context, specifier, env);
      if (builtin) return builtin;
    }
    return undefined;
  }

  async resolveLatestTarget(
    target: PackageTarget,
    { provider, layer }: PackageProvider,
    parentUrl: string,
    resolver: Resolver
  ): Promise<ExactPackage> {
    // find the range to resolve latest
    let range: any;
    for (const possibleRange of target.ranges.sort(target.ranges[0].constructor.compare)) {
      if (!range) {
        range = possibleRange;
      } else if (possibleRange.gt(range) && !range.contains(possibleRange)) {
        range = possibleRange;
      }
    }

    const latestTarget = {
      registry: target.registry,
      name: target.name,
      range,
      unstable: target.unstable
    };

    const resolveLatestTarget = this.#getProvider(provider).resolveLatestTarget;
    const pkg = await resolveLatestTarget.call(
      this.#getProviderContext(provider),
      latestTarget,
      layer,
      parentUrl,
      resolver
    );
    if (pkg) return pkg;

    if (provider === 'nodemodules') {
      throw new JspmError(
        `Cannot find package ${target.name} in node_modules from parent ${parentUrl}. Try installing "${target.name}" with npm first adding it to package.json "dependencies" or running "npm install --save ${target.name}".`
      );
    } else {
      throw new JspmError(
        `Unable to resolve package ${latestTarget.registry}:${latestTarget.name} in range "${latestTarget.range}" from parent ${parentUrl}.`
      );
    }
  }

  /**
   * Configure all providers with the given configuration
   *
   * @param providerConfig Configuration for providers
   */
  #configure(providerConfig: Record<string, any>): void {
    for (const [providerName, provider] of Object.entries(this.providers)) {
      if (provider.configure) {
        provider.configure.call(
          this.#getProviderContext(providerName),
          providerConfig[providerName] || {}
        );
      }
    }
  }

  /**
   * Get the supported provider strings for all providers
   *
   * @returns List of provider string identifiers
   */
  getProviderStrings(): string[] {
    let res: string[] = [];
    for (const [name, provider] of Object.entries(this.providers)) {
      for (const layer of provider.supportedLayers ?? ['default'])
        res.push(`${name}${layer === 'default' ? '' : `#${layer}`}`);
    }
    return res;
  }

  /**
   * Downloads the given package files into the local folder path outDir
   * Does not include the import map, which must be merged separately.
   */
  download(pkg: ExactPackage, providerName: string) {
    const provider = this.#getProvider(providerName);
    if (!provider.download) {
      throw new JspmError(
        `Provider "${providerName}" does not currently support publishing from JSPM`
      );
    }
    return provider.download.call(this.#getProviderContext(providerName), pkg);
  }

  /**
   * Publish a package using the specified provider.
   * A publish operation may be an import map only, files only, or both.
   *
   * @param pkg Package name, version and registry to publish
   * @param providerName Name of the provider to use
   * @param files Package files to publish
   * @param importMap Optional import map to include with the publish
   */
  async publish(
    pkg: ExactPackage,
    providerName: string,
    imports: string[],
    files: undefined,
    importMap: undefined
  ): Promise<PublishOutput>;
  async publish(
    pkg: ExactPackage,
    providerName: string,
    imports: string[],
    files: Record<string, string | ArrayBuffer>,
    importMap: undefined
  ): Promise<PublishOutput>;
  async publish(
    pkg: ExactPackage,
    providerName: string,
    imports: string[],
    files: Record<string, string | ArrayBuffer>,
    importMap: ImportMap
  ): Promise<PublishOutput>;
  async publish(
    pkg: ExactPackage,
    providerName: string,
    imports: string[],
    files?: Record<string, string | ArrayBuffer> | undefined,
    importMap?: ImportMap | undefined
  ): Promise<PublishOutput> {
    const provider = this.#getProvider(providerName);

    if (!provider.publish) {
      throw new JspmError(`Provider "${providerName}" does not support publishing on JSPM`);
    }

    return provider.publish.call(
      this.#getProviderContext(providerName),
      pkg,
      files,
      importMap,
      imports
    );
  }

  /**
   * Authenticate with a provider to obtain an authentication token
   *
   * @param providerName Name of the provider to authenticate with
   * @param options Authentication options
   * @returns Promise resolving to the authentication token
   */
  async auth(
    providerName: string,
    options: {
      username?: string;
      verify?: (url: string, instructions: string) => void;
    } = {}
  ): Promise<{ token: string }> {
    const provider = this.#getProvider(providerName);

    if (!provider.auth) {
      throw new JspmError(`Provider "${providerName}" does not support authentication`);
    }

    return provider.auth.call(this.#getProviderContext(providerName), options);
  }
}

export interface PublishOutput {
  packageUrl: `${string}/`;
  mapUrl: string;
  codeSnippet?: string;
}

export const defaultProviders: Record<string, Provider> = {
  deno,
  jsdelivr,
  node,
  skypack,
  unpkg,
  'esm.sh': esmsh,
  'jspm.io': jspm
};

export function getDefaultProviderStrings() {
  let res = [];
  for (const [name, provider] of Object.entries(defaultProviders)) {
    for (const layer of provider.supportedLayers ?? ['default'])
      res.push(`${name}${layer === 'default' ? '' : `#${layer}`}`);
  }

  return res;
}

export const registryProviders: Record<string, string> = {
  'denoland:': 'deno',
  'deno:': 'deno'
};

export const mappableSchemes = new Set<String>(['npm', 'deno', 'node']);

export const builtinSchemes = new Set<String>(['node', 'deno']);
