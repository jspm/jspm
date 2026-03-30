import {
  baseUrl,
  rebase,
  isPlain,
  isURL,
  getCommonBase,
  resolve,
  sameOrigin,
} from "./url.js";
import { alphabetize } from "./alphabetize.js";

export interface IImportMap {
  imports?: Record<string, string>;
  scopes?: {
    [scope: string]: Record<string, string>;
  };
  integrity?: {
    [url: string]: string
  }
}

class MapMatcher {
  prefixMatches: string[];
  results: Map<string, string | undefined> = new Map();
  constructor(map: Record<string, any>) {
    this.prefixMatches = Object.keys(map)
      .filter((match) => match.endsWith("/") || match.endsWith("*"))
      .sort((matchA, matchB) => (matchA.length < matchB.length ? 1 : -1));
  }
}

export class ImportMap implements IImportMap {
  imports: Record<string, string> = Object.create(null);
  scopes: Record<string, Record<string, string>> = Object.create(null);
  integrity: Record<string, string> = Object.create(null);

  /**
   * The absolute URL of the import map, for determining relative resolutions
   * When using file:/// URLs this allows relative modules to be co-located
   */
  mapUrl: URL | null;
  /**
   * The URL to use for root-level resolutions in the import map
   * If null, root resolutions are not resolved and instead left as-is
   *
   * By default, rootUrl is null unless the mapUrl is an http or https URL,
   * in which case it is taken to be the root of the mapUrl.
   */
  rootUrl: URL | null;

  #importsMatcher: MapMatcher;
  #scopeMatchers: Record<string, MapMatcher>;
  #scopeCandidates: [string, string][];
  #scopeMatchCache: Map<string, [string, string][]>;
  #resolveCache: Map<string, string>;
  #dirty = false;

  /**
   * Create a new import map instance
   *
   * @param opts import map options, can be an optional bag of { map?, mapUrl?, rootUrl? } or just a direct mapUrl
   */
  constructor(
    opts:
      | {
          map?: IImportMap;
          mapUrl?: string | URL;
          rootUrl?: string | URL | null;
        }
      | string
      | URL
  ) {
    let {
      map,
      mapUrl = baseUrl,
      rootUrl,
    } = opts instanceof URL ||
    typeof opts === "string" ||
    typeof opts === "undefined"
      ? { mapUrl: opts, map: undefined, rootUrl: undefined }
      : opts;
    if (typeof mapUrl === "string") mapUrl = new URL(mapUrl);
    this.mapUrl = mapUrl;
    if (
      rootUrl === undefined &&
      (this.mapUrl.protocol === "http:" || this.mapUrl.protocol === "https:")
    )
      rootUrl = new URL("/", this.mapUrl);
    else if (typeof rootUrl === "string") rootUrl = new URL(rootUrl);
    this.rootUrl = rootUrl || null;
    this.#importsMatcher = new MapMatcher(this.imports);
    this.#scopeMatchers = Object.create(null);
    this.#scopeCandidates = [];
    this.#scopeMatchCache = new Map();
    this.#resolveCache = new Map();
    if (map) this.extend(map);
  }

  /**
   * Clones the import map
   * @returns Cloned import map
   */
  clone() {
    return new ImportMap({ mapUrl: this.mapUrl, rootUrl: this.rootUrl }).extend(
      this
    );
  }

  /**
   * Extends the import map mappings
   * @param map Import map to extend with
   * @param overrideScopes Set to true to have scopes be replacing instead of extending
   * @returns ImportMap for chaining
   */
  extend(map: IImportMap, overrideScopes = false) {
    Object.assign(this.imports, map.imports);
    if (overrideScopes) {
      Object.assign(this.scopes, map.scopes);
    } else if (map.scopes) {
      for (const scope of Object.keys(map.scopes))
        Object.assign(
          (this.scopes[scope] = this.scopes[scope] || Object.create(null)),
          map.scopes[scope]
        );
    }
    Object.assign(this.integrity, map.integrity);
    this.rebase();
    return this;
  }

  #refreshCaches() {
    this.#importsMatcher = new MapMatcher(this.imports);
    this.#scopeMatchers = Object.create(null);
    for (const scope of Object.keys(this.scopes)) {
      this.#scopeMatchers[scope] = new MapMatcher(this.scopes[scope]);
    }
    this.#scopeCandidates = Object.keys(this.scopes)
      .map((scope): [string, string] => [
        scope,
        resolve(scope, this.mapUrl, this.rootUrl),
      ])
      .sort(([, a], [, b]) => (a.length < b.length ? 1 : -1));
    this.#scopeMatchCache.clear();
    this.#resolveCache.clear();
  }

  /**
   * Performs an alphanumerical sort on the import map imports and scopes
   * @returns ImportMap for chaining
   */
  sort() {
    this.imports = alphabetize(this.imports);
    this.scopes = alphabetize(this.scopes);
    for (const scope of Object.keys(this.scopes))
      this.scopes[scope] = alphabetize(this.scopes[scope]);
    this.integrity = alphabetize(this.integrity);
    return this;
  }

  /**
   * Set a specific entry in the import map
   *
   * @param name Specifier to set
   * @param target Target of the map
   * @param parent Optional parent scope
   * @returns ImportMap for chaining
   */
  set(name: string, target: string, parent?: string) {
    if (!parent) {
      this.imports[name] = target;
    } else {
      this.scopes[parent] = this.scopes[parent] || Object.create(null);
      this.scopes[parent][name] = target;
    }
    this.#dirty = true;
    return this;
  }
  /**
   * @param target URL target
   * @param integrity Integrity
   */
  setIntegrity(target: string, integrity: string) {
    this.integrity[target] = integrity;
    const targetRebased = rebase(target, this.mapUrl, this.rootUrl);
    if (targetRebased !== target && this.integrity[targetRebased])
      delete this.integrity[targetRebased];
    if (targetRebased.startsWith('./') && target !== targetRebased.slice(2) && this.integrity[targetRebased.slice(2)])
      delete this.integrity[targetRebased.slice(2)];
  }
  /**
   * @param target URL target
   * @param integrity Integrity
   */
  getIntegrity(target: string, integrity: string) {
    const targetResolved = resolve(target, this.mapUrl, this.rootUrl);
    if (this.integrity[targetResolved]) return this.integrity[targetResolved];
    const targetRebased = rebase(targetResolved, this.mapUrl, this.rootUrl);
    if (this.integrity[targetRebased]) return this.integrity[targetRebased];
    if (this.integrity[targetRebased.slice(2)]) return this.integrity[targetRebased.slice(2)];
  }

  /**
   * Bulk replace URLs in the import map
   * Provide a URL ending in "/" to perform path replacements
   *
   * @param url {String} The URL to replace
   * @param newUrl {String} The URL to replace it with
   * @returns ImportMap for chaining
   */
  replace(url: string, newUrl: string) {
    const replaceSubpaths = url.endsWith("/");
    if (!isURL(url)) throw new Error("URL remapping only supports URLs");
    const newRelPkgUrl = rebase(newUrl, this.mapUrl, this.rootUrl);
    if (this.imports[url]) {
      this.imports[newRelPkgUrl] = this.imports[url];
      delete this.imports[url];
    }
    if (replaceSubpaths) {
      for (const impt of Object.keys(this.imports)) {
        const target = this.imports[impt];
        if (target.startsWith(url)) {
          this.imports[impt] = newRelPkgUrl + target.slice(url.length);
        }
      }
    }
    for (const scope of Object.keys(this.scopes)) {
      const scopeImports = this.scopes[scope];
      const scopeUrl = resolve(scope, this.mapUrl, this.rootUrl);
      if ((replaceSubpaths && scopeUrl.startsWith(url)) || scopeUrl === url) {
        const newScope = newRelPkgUrl + scopeUrl.slice(url.length);
        delete this.scopes[scope];
        this.scopes[newScope] = scopeImports;
      }
      for (const impt of Object.keys(scopeImports)) {
        const target = scopeImports[impt];
        if ((replaceSubpaths && target.startsWith(url)) || target === url)
          scopeImports[impt] = newRelPkgUrl + target.slice(url.length);
      }
    }
    if (this.integrity[url]) {
      this.integrity[newRelPkgUrl] = this.integrity[url];
      delete this.integrity[url];
    }
    this.#dirty = true;
    return this;
  }

  /**
   * Groups subpath mappings into path mappings when multiple exact subpaths
   * exist under the same path.
   *
   * For two mappings like { "base/a.js": "/a.js", "base/b.js": "/b.js" },
   * these will be replaced with a single path mapping { "base/": "/" }.
   * Groupings are done throughout all import scopes individually.
   *
   * @param targets Which sections to combine: 'scopes' (default) or 'both' (includes top-level imports)
   * @returns ImportMap for chaining
   */
  /**
   * Condense import entries sharing a common prefix into a single
   * trailing-slash entry. Entries with inconsistent URL bases (e.g.
   * shadowed exports) are left in place alongside the prefix entry.
   *
   * @param prefixes Import key prefixes to condense (e.g. "pkg/modules/")
   * @returns ImportMap for chaining
   */
  condenseImports(prefixes: { imports?: Set<string>, scopes?: Record<string, Set<string>> }) {
    const condenseMappings = (mappings: Record<string, string>, safePrefixes: Set<string>) => {
      for (const prefix of safePrefixes) {
        for (const key of Object.keys(mappings)) {
          if (!key.startsWith(prefix) || key === prefix) continue;
          const suffix = key.slice(prefix.length);
          const value = mappings[key];
          if (!value.endsWith(suffix)) continue;
          mappings[prefix] ??= value.slice(0, value.length - suffix.length);
          if (value.startsWith(mappings[prefix])) {
            delete mappings[key];
          }
        }
      }
    };

    if (prefixes.imports)
      condenseMappings(this.imports, prefixes.imports);
    if (prefixes.scopes)
      for (const scope of Object.keys(prefixes.scopes))
        if (this.scopes[scope])
          condenseMappings(this.scopes[scope], prefixes.scopes[scope]);

    this.#dirty = true;
    return this;
  }

  combineSubpaths(targets: 'scopes' | 'both' = 'scopes') {
    // iterate possible bases and submappings, grouping bases greedily
    const combineSubpathMappings = (mappings: Record<string, string>) => {
      let outMappings: Record<string, string> = Object.create(null);
      for (let impt of Object.keys(mappings)) {
        const target = mappings[impt];
        // Check if this import is already handled by an existing path mapping
        // If so, either merge with it or continue on
        let mapMatch;
        if (isPlain(impt)) {
          mapMatch = getMapMatch(impt, outMappings);
        } else {
          mapMatch =
            getMapMatch(
              (impt = rebase(impt, this.mapUrl, this.rootUrl)),
              outMappings
            ) ||
            (this.rootUrl &&
              getMapMatch(
                (impt = rebase(impt, this.mapUrl, null)),
                outMappings
              )) ||
            undefined;
        }
        if (
          mapMatch &&
          impt.slice(mapMatch.length) ===
            resolve(target, this.mapUrl, this.rootUrl).slice(
              resolve(outMappings[mapMatch], this.mapUrl, this.rootUrl).length
            )
        ) {
          continue;
        }

        let newbase = false;
        const targetParts = mappings[impt].split("/");
        const imptParts = impt.split("/");
        for (let j = imptParts.length - 1; j > 0; j--) {
          const subpath = imptParts.slice(j).join("/");
          const subpathTarget = targetParts
            .slice(targetParts.length - (imptParts.length - j))
            .join("/");
          if (subpath !== subpathTarget) {
            outMappings[impt] = mappings[impt];
            break;
          }
          const base = imptParts.slice(0, j).join("/") + "/";
          if (outMappings[base]) continue;
          const baseTarget =
            targetParts
              .slice(0, targetParts.length - (imptParts.length - j))
              .join("/") + "/";

          // Dedupe existing mappings against the new base to remove them
          // And if we dont dedupe against anything then dont perform this basing
          for (let impt of Object.keys(outMappings)) {
            const target = outMappings[impt];
            let matches = false;
            if (isPlain(impt)) {
              matches = impt.startsWith(base);
            } else {
              matches =
                (impt = rebase(impt, this.mapUrl, this.rootUrl)).startsWith(
                  base
                ) ||
                (impt = rebase(impt, this.mapUrl, this.rootUrl)).startsWith(
                  base
                );
            }
            if (
              matches &&
              impt.slice(base.length) ===
                resolve(target, this.mapUrl, this.rootUrl).slice(
                  resolve(baseTarget, this.mapUrl, this.rootUrl).length
                )
            ) {
              newbase = true;
              delete outMappings[impt];
            }
          }

          if (newbase) {
            outMappings[base] = baseTarget;
            break;
          }
        }

        if (!newbase) outMappings[impt] = target;
      }
      return outMappings;
    };

    if (targets === 'both') {
      this.imports = combineSubpathMappings(this.imports);
    }
    if (targets === 'scopes' || targets === 'both') {
      for (const scope of Object.keys(this.scopes)) {
        this.scopes[scope] = combineSubpathMappings(this.scopes[scope]);
      }
    }

    this.#dirty = true;
    return this;
  }

  /**
   * Groups the import map scopes to shared URLs to reduce duplicate mappings.
   *
   * For two given scopes, "https://site.com/x/" and "https://site.com/y/",
   * a single scope will be constructed for "https://site.com/" including
   * their shared mappings, only retaining the scopes if they have differences.
   *
   * In the case where the scope is on the same origin as the mapUrl, the grouped
   * scope is determined based on determining the common baseline over all local scopes
   *
   * @returns ImportMap for chaining
   */
  flatten() {
    // Ensure resolve cache is fresh before we use it
    if (this.#dirty) {
      this.#refreshCaches();
      this.#dirty = false;
    }

    const urlCache = new Map<string, string>();
    const cachedResolve = (url: string): string => {
      let resolved = urlCache.get(url);
      if (resolved !== undefined) return resolved;
      resolved = resolve(url, this.mapUrl, this.rootUrl);
      urlCache.set(url, resolved);
      return resolved;
    };

    // First, determine the common base for the local mappings if any
    let localScopemapUrl: string | null = null;
    for (const scope of Object.keys(this.scopes)) {
      const resolvedScope = cachedResolve(scope);
      if (isURL(resolvedScope)) {
        const scopeUrl = new URL(resolvedScope);
        if (sameOrigin(scopeUrl, this.mapUrl)) {
          if (!localScopemapUrl) localScopemapUrl = scopeUrl.href;
          else
            localScopemapUrl = getCommonBase(scopeUrl.href, localScopemapUrl);
        }
      } else {
        if (!localScopemapUrl) localScopemapUrl = resolvedScope;
        else localScopemapUrl = getCommonBase(resolvedScope, localScopemapUrl);
      }
    }

    // for each scope, update its mappings to be in the shared base where possible
    const relativeLocalScopemapUrl = localScopemapUrl
      ? rebase(localScopemapUrl, this.mapUrl, this.rootUrl)
      : null;
    for (const scope of Object.keys(this.scopes)) {
      const scopeImports = this.scopes[scope];

      let scopemapUrl: string;
      const resolvedScope = cachedResolve(scope);
      if (isURL(resolvedScope)) {
        const scopeUrl = new URL(resolvedScope);
        if (sameOrigin(scopeUrl, this.mapUrl)) {
          scopemapUrl = relativeLocalScopemapUrl;
        } else {
          scopemapUrl =
            scopeUrl.protocol +
            "//" +
            scopeUrl.hostname +
            (scopeUrl.port ? ":" + scopeUrl.port : "") +
            "/";
        }
      } else {
        scopemapUrl = relativeLocalScopemapUrl;
      }

      let scopeBase: Record<string, string> | null =
        this.scopes[scopemapUrl] || Object.create(null);
      if (scopeBase === scopeImports) scopeBase = null;

      let flattenedAll = true;
      for (const name of Object.keys(scopeImports)) {
        const target = scopeImports[name];
        if (
          this.imports[name] &&
          cachedResolve(this.imports[name]) === cachedResolve(target)
        ) {
          delete scopeImports[name];
        } else if (
          scopeBase &&
          (!scopeBase[name] ||
            cachedResolve(scopeBase[name]) === cachedResolve(target))
        ) {
          scopeBase[name] = rebase(target, this.mapUrl, this.rootUrl);
          delete scopeImports[name];
          this.scopes[<string>scopemapUrl] = alphabetize(scopeBase);
        } else {
          flattenedAll = false;
        }
      }
      if (flattenedAll) delete this.scopes[scope];
    }
    this.#dirty = true;
    return this;
  }

  /**
   * Rebase the entire import map to a new mapUrl and rootUrl
   *
   * If the rootUrl is not provided, it will remain null if it was
   * already set to null.
   *
   * Otherwise, just like the constructor options, the rootUrl
   * will default to the mapUrl base if it is an http: or https:
   * scheme URL, and null otherwise keeping absolute URLs entirely
   * in-tact.
   *
   * @param mapUrl The new map URL to use
   * @param rootUrl The new root URL to use
   * @returns ImportMap for chaining
   */
  rebase(mapUrl: URL | string = this.mapUrl, rootUrl?: URL | string | null) {
    if (typeof mapUrl === "string") mapUrl = new URL(mapUrl);
    if (rootUrl === undefined) {
      if (mapUrl.href === this.mapUrl.href) rootUrl = this.rootUrl;
      else
        rootUrl =
          this.rootUrl === null ||
          (mapUrl.protocol !== "https:" && mapUrl.protocol !== "http:")
            ? null
            : new URL("/", mapUrl);
    } else if (typeof rootUrl === "string") rootUrl = new URL(rootUrl);
    let changedImportProps = false;
    for (const impt of Object.keys(this.imports)) {
      const target = this.imports[impt];
      this.imports[impt] = rebase(
        resolve(target, this.mapUrl, this.rootUrl),
        mapUrl,
        rootUrl
      );
      if (!isPlain(impt)) {
        const newImpt = rebase(
          resolve(impt, this.mapUrl, this.rootUrl),
          mapUrl,
          rootUrl
        );
        if (newImpt !== impt) {
          changedImportProps = true;
          this.imports[newImpt] = this.imports[impt];
          delete this.imports[impt];
        }
      }
    }
    if (changedImportProps) this.imports = alphabetize(this.imports);
    let changedScopeProps = false;
    // Create a temporary map to collect scopes by their rebased URLs
    const rebasedScopes: Record<string, Record<string, string>> = Object.create(null);

    for (const scope of Object.keys(this.scopes)) {
      const scopeImports = this.scopes[scope];
      let changedScopeImportProps = false;
      for (const impt of Object.keys(scopeImports)) {
        const target = scopeImports[impt];
        scopeImports[impt] = rebase(
          resolve(target, this.mapUrl, this.rootUrl),
          mapUrl,
          rootUrl
        );
        if (!isPlain(impt)) {
          const newName = rebase(
            resolve(impt, this.mapUrl, this.rootUrl),
            mapUrl,
            rootUrl
          );
          if (newName !== impt) {
            changedScopeImportProps = true;
            scopeImports[newName] = scopeImports[impt];
            delete scopeImports[impt];
          }
        }
      }
      if (changedScopeImportProps)
        this.scopes[scope] = alphabetize(scopeImports);
      const newScope = rebase(
        resolve(scope, this.mapUrl, this.rootUrl),
        mapUrl,
        rootUrl
      );

      // Check if this scope URL already exists in our rebased collection
      if (rebasedScopes[newScope]) {
        // Merge the imports from this scope into the existing one
        Object.assign(rebasedScopes[newScope], scopeImports);
        changedScopeProps = true;
      } else {
        // First time seeing this rebased scope URL
        rebasedScopes[newScope] = scopeImports;
        if (scope !== newScope) {
          changedScopeProps = true;
        }
      }
    }

    // Replace the scopes with the unified rebased scopes
    this.scopes = rebasedScopes;
    if (changedScopeProps) this.scopes = alphabetize(this.scopes);
    let changedIntegrityProps = false;
    for (const target of Object.keys(this.integrity)) {
      const newTarget = rebase(
        resolve(target, this.mapUrl, this.rootUrl),
        mapUrl,
        rootUrl
      );
      if (target !== newTarget) {
        this.integrity[newTarget] = this.integrity[target];
        delete this.integrity[target];
        changedIntegrityProps = true;
      }
    }
    if (changedIntegrityProps) this.integrity = alphabetize(this.integrity);
    this.mapUrl = mapUrl;
    this.rootUrl = rootUrl;
    this.#dirty = true;
    return this;
  }

  /**
   * Perform a module resolution against the import map
   *
   * @param specifier Specifier to resolve
   * @param parentUrl Parent URL to resolve against
   * @returns Resolved URL string
   */
  resolve(specifier: string, parentUrl: string | URL = this.mapUrl): string {
    if (this.#dirty) {
      this.#refreshCaches();
      this.#dirty = false;
    }
    if (typeof parentUrl !== "string") parentUrl = parentUrl.toString();
    parentUrl = resolve(parentUrl, this.mapUrl, this.rootUrl);
    const cacheKey = `${parentUrl}\0${specifier}`;
    const cached = this.#resolveCache.get(cacheKey);
    if (cached !== undefined) return cached;
    let specifierUrl: URL | undefined;
    if (!isPlain(specifier)) {
      specifierUrl = new URL(specifier, parentUrl);
      specifier = specifierUrl.href;
    }
    const scopeMatches = this.#getScopeMatches(parentUrl);
    for (const [scope] of scopeMatches) {
      const scopeMatcher = this.#scopeMatchers[scope];
      let mapMatch = getMapMatch.call(scopeMatcher, specifier, this.scopes[scope]);
      if (!mapMatch && specifierUrl) {
        mapMatch =
          getMapMatch.call(
            scopeMatcher,
            (specifier = rebase(specifier, this.mapUrl, this.rootUrl)),
            this.scopes[scope]
          ) ||
          (this.rootUrl &&
            getMapMatch.call(
              scopeMatcher,
              (specifier = rebase(specifier, this.mapUrl, null)),
              this.scopes[scope]
            )) ||
          undefined;
      }
      if (mapMatch) {
        const target = this.scopes[scope][mapMatch];
        const resolved = resolve(
          target + specifier.slice(mapMatch.length),
          this.mapUrl,
          this.rootUrl
        );
        this.#resolveCache.set(cacheKey, resolved);
        return resolved;
      }
    }
    let mapMatch = getMapMatch.call(this.#importsMatcher, specifier, this.imports);
    if (!mapMatch && specifierUrl) {
      mapMatch =
        getMapMatch.call(
          this.#importsMatcher,
          (specifier = rebase(specifier, this.mapUrl, this.rootUrl)),
          this.imports
        ) ||
        (this.rootUrl &&
          getMapMatch.call(
            this.#importsMatcher,
            (specifier = rebase(specifier, this.mapUrl, null)),
            this.imports
          )) ||
        undefined;
    }
    if (mapMatch) {
      const target = this.imports[mapMatch];
      const resolved = resolve(
        target + specifier.slice(mapMatch.length),
        this.mapUrl,
        this.rootUrl
      );
      this.#resolveCache.set(cacheKey, resolved);
      return resolved;
    }
    if (specifierUrl) {
      this.#resolveCache.set(cacheKey, specifierUrl.href);
      return specifierUrl.href;
    }
    throw new Error(`Unable to resolve ${specifier} in ${parentUrl}`);
  }

  #getScopeMatches(parentUrl: string): [string, string][] {
    const cached = this.#scopeMatchCache.get(parentUrl);
    if (cached) return cached;
    const matches = this.#scopeCandidates.filter(([, scopeUrl]) => {
      return (
        scopeUrl === parentUrl ||
        (scopeUrl.endsWith("/") && parentUrl.startsWith(scopeUrl))
      );
    });
    this.#scopeMatchCache.set(parentUrl, matches);
    return matches;
  }

  /**
   * Get the import map JSON data
   *
   * @returns Import map data
   */
  toJSON(): IImportMap {
    const obj: any = {};
    if (Object.keys(this.imports).length) obj.imports = this.imports;
    if (Object.keys(this.scopes).length) obj.scopes = this.scopes;
    if (Object.keys(this.integrity).length) obj.integrity = this.integrity;
    return JSON.parse(JSON.stringify(obj));
  }
}

const scopeCandidateCache = new WeakMap<
  Record<string, Record<string, string>>,
  { keyCount: number; candidates: [string, string][] }
>();

export function getScopeMatches(
  parentUrl: string,
  scopes: Record<string, Record<string, string>>,
  mapUrl: URL,
  rootUrl?: URL
): [string, string][] {
  const keys = Object.keys(scopes);
  let cached = scopeCandidateCache.get(scopes);
  if (!cached || cached.keyCount !== keys.length) {
    const candidates = keys
      .map((scope): [string, string] => [scope, resolve(scope, mapUrl, rootUrl)])
      .sort(([, a], [, b]) => (a.length < b.length ? 1 : -1));
    cached = { keyCount: keys.length, candidates };
    scopeCandidateCache.set(scopes, cached);
  }

  return cached.candidates.filter(([, scopeUrl]) => {
    return (
      scopeUrl === parentUrl ||
      (scopeUrl.endsWith("/") && parentUrl.startsWith(scopeUrl))
    );
  });
}

export function getMapMatch<T = any>(
  this: MapMatcher | void,
  specifier: string,
  map: Record<string, T>
): string | undefined {
  if (specifier in map) return specifier;
  if (this instanceof MapMatcher) {
    const cached = this.results.get(specifier);
    if (cached !== undefined) return cached;
    let curMatch: string | undefined;
    for (const match of this.prefixMatches) {
      const wildcard = match.endsWith("*");
      if (specifier.startsWith(wildcard ? match.slice(0, -1) : match)) {
        if (!curMatch || match.length > curMatch.length) curMatch = match;
      }
    }
    this.results.set(specifier, curMatch);
    return curMatch;
  }
  let curMatch;
  for (const match of Object.keys(map)) {
    const wildcard = match.endsWith("*");
    if (!match.endsWith("/") && !wildcard) continue;
    if (specifier.startsWith(wildcard ? match.slice(0, -1) : match)) {
      if (!curMatch || match.length > curMatch.length) curMatch = match;
    }
  }
  return curMatch;
}
