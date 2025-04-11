import { JspmError } from "../common/err.js";
import { importedFrom } from "../common/url.js";
import { LatestPackageTarget } from "../install/package.js";
import { pkgToStr } from "../install/package.js";
import { ExactPackage } from "../install/package.js";
import { Resolver } from "../trace/resolver.js";
// @ts-ignore
import { SemverRange } from "sver";
// @ts-ignore
import { fetch } from "../common/fetch.js";

let cdnUrl = "https://ga.jspm.io/";
const systemCdnUrl = "https://ga.system.jspm.io/";
const apiUrl = "https://api.jspm.io/";

const BUILD_POLL_TIME = 60 * 1000;
const BUILD_POLL_INTERVAL = 5 * 1000;

interface JspmCache {
  lookupCache: Map<string, Promise<ExactPackage>>;
  versionsCacheMap: Map<string, string[]>;
  resolveCache: Record<
    string,
    {
      latest: Promise<ExactPackage | null>;
      majors: Record<string, Promise<ExactPackage | null>>;
      minors: Record<string, Promise<ExactPackage | null>>;
      tags: Record<string, Promise<ExactPackage | null>>;
    }
  >;
  cachedErrors: Map<string, Promise<boolean>>;
  buildRequested: Map<string, Promise<void>>;
}

export const supportedLayers = ["default", "system"];

export async function pkgToUrl(
  pkg: ExactPackage,
  layer: string
): Promise<`${string}/`> {
  return `${layer === "system" ? systemCdnUrl : cdnUrl}${pkgToStr(pkg)}/`;
}

export function configure(config: any) {
  if (config.cdnUrl) cdnUrl = config.cdnUrl;
}

const exactPkgRegEx =
  /^(([a-z]+):)?((?:@[^/\\%@]+\/)?[^./\\%@][^/\\%@]*)@([^\/]+)(\/.*)?$/;

export function parseUrlPkg(url: string) {
  let subpath = null;
  let layer: string;
  if (url.startsWith(cdnUrl)) layer = "default";
  else if (url.startsWith(systemCdnUrl)) layer = "system";
  else return;
  const [, , registry, name, version] =
    url
      .slice((layer === "default" ? cdnUrl : systemCdnUrl).length)
      .match(exactPkgRegEx) || [];
  if (registry && name && version) {
    if (
      registry === "npm" &&
      name === "@jspm/core" &&
      url.includes("/nodelibs/")
    ) {
      subpath = `./nodelibs/${
        url.slice(url.indexOf("/nodelibs/") + 10).split("/")[1]
      }`;
      if (subpath && subpath.endsWith(".js")) subpath = subpath.slice(0, -3);
      else subpath = null;
    }
    return { pkg: { registry, name, version }, layer, subpath };
  }
}

function getJspmCache(resolver: Resolver): JspmCache {
  const jspmCache = resolver.context.jspmCache;
  if (!resolver.context.jspmCache) {
    return (resolver.context.jspmCache = {
      lookupCache: new Map(),
      versionsCacheMap: new Map(),
      resolveCache: {},
      cachedErrors: new Map(),
      buildRequested: new Map(),
    });
  }
  return jspmCache;
}

async function checkBuildOrError(
  resolver: Resolver,
  pkgUrl: string,
  fetchOpts: any
): Promise<boolean> {
  const pcfg = await resolver.getPackageConfig(pkgUrl);
  if (pcfg) {
    return true;
  }
  const { cachedErrors } = getJspmCache(resolver);
  // no package.json! Check if there's a build error:
  if (cachedErrors.has(pkgUrl)) return cachedErrors.get(pkgUrl);

  const cachedErrorPromise = (async () => {
    try {
      const errLog = await fetch.text(`${pkgUrl}/_error.log`, fetchOpts);
      throw new JspmError(
        `Resolved dependency ${pkgUrl} with error:\n\n${errLog}\nPlease post an issue at jspm/project on GitHub, or by following the link below:\n\nhttps://github.com/jspm/project/issues/new?title=CDN%20build%20error%20for%20${encodeURIComponent(
          pkgUrl
        )}&body=_Reporting%20CDN%20Build%20Error._%0A%0A%3C!--%20%20No%20further%20description%20necessary,%20just%20click%20%22Submit%20new%20issue%22%20--%3E`
      );
    } catch (e) {
      return false;
    }
  })();
  cachedErrors.set(pkgUrl, cachedErrorPromise);
  return cachedErrorPromise;
}

async function ensureBuild(
  resolver: Resolver,
  pkg: ExactPackage,
  fetchOpts: any
) {
  if (
    await checkBuildOrError(resolver, await pkgToUrl(pkg, "default"), fetchOpts)
  )
    return;

  const fullName = `${pkg.name}@${pkg.version}`;

  const { buildRequested } = getJspmCache(resolver);

  // no package.json AND no build error -> post a build request
  // once the build request has been posted, try polling for up to 2 mins
  if (buildRequested.has(fullName)) return buildRequested.get(fullName);
  const buildPromise = (async () => {
    const buildRes = await fetch(`${apiUrl}build/${fullName}`, fetchOpts);
    if (!buildRes.ok && buildRes.status !== 403) {
      const err = (await buildRes.json()).error;
      throw new JspmError(
        `Unable to request the JSPM API for a build of ${fullName}, with error: ${err}.`
      );
    }

    // build requested -> poll on that
    let startTime = Date.now();
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, BUILD_POLL_INTERVAL));

      if (
        await checkBuildOrError(
          resolver,
          await pkgToUrl(pkg, "default"),
          fetchOpts
        )
      )
        return;

      if (Date.now() - startTime >= BUILD_POLL_TIME)
        throw new JspmError(
          `Timed out waiting for the build of ${fullName} to be ready on the JSPM CDN. Try again later, or post a jspm.io project issue at https://github.com/jspm/project if the problem persists.`
        );
    }
  })();
  buildRequested.set(fullName, buildPromise);
  return buildPromise;
}

export async function resolveLatestTarget(
  this: Resolver,
  target: LatestPackageTarget,
  layer: string,
  parentUrl: string
): Promise<ExactPackage | null> {
  const { registry, name, range, unstable } = target;

  // exact version optimization
  if (range.isExact && !range.version.tag) {
    const pkg = { registry, name, version: range.version.toString() };
    await ensureBuild(this, pkg, this.fetchOpts);
    return pkg;
  }

  const { resolveCache } = getJspmCache(this);

  const cache = (resolveCache[target.registry + ":" + target.name] =
    resolveCache[target.registry + ":" + target.name] || {
      latest: null,
      majors: Object.create(null),
      minors: Object.create(null),
      tags: Object.create(null),
    });

  if (range.isWildcard || (range.isExact && range.version.tag === "latest")) {
    let lookup = await (cache.latest ||
      (cache.latest = lookupRange.call(
        this,
        registry,
        name,
        "",
        unstable,
        parentUrl
      )));
    // Deno wat?
    if (lookup instanceof Promise) lookup = await lookup;
    if (!lookup) return null;
    this.log(
      "jspm/resolveLatestTarget",
      `${target.registry}:${target.name}@${range} -> WILDCARD ${
        lookup.version
      }${parentUrl ? " [" + parentUrl + "]" : ""}`
    );
    await ensureBuild(this, lookup, this.fetchOpts);
    return lookup;
  }
  if (range.isExact && range.version.tag) {
    const tag = range.version.tag;
    let lookup = await (cache.tags[tag] ||
      (cache.tags[tag] = lookupRange.call(
        this,
        registry,
        name,
        tag,
        unstable,
        parentUrl
      )));
    // Deno wat?
    if (lookup instanceof Promise) lookup = await lookup;
    if (!lookup) return null;
    this.log(
      "jspm/resolveLatestTarget",
      `${target.registry}:${target.name}@${range} -> TAG ${tag}${
        parentUrl ? " [" + parentUrl + "]" : ""
      }`
    );
    await ensureBuild(this, lookup, this.fetchOpts);
    return lookup;
  }
  let stableFallback = false;
  if (range.isMajor) {
    const major = range.version.major;
    let lookup = await (cache.majors[major] ||
      (cache.majors[major] = lookupRange.call(
        this,
        registry,
        name,
        major,
        unstable,
        parentUrl
      )));
    // Deno wat?
    if (lookup instanceof Promise) lookup = await lookup;
    if (!lookup) return null;
    // if the latest major is actually a downgrade, use the latest minor version (fallthrough)
    // note this might miss later major prerelease versions, which should strictly be supported via a pkg@X@ unstable major lookup
    if (range.version.gt(lookup.version)) {
      stableFallback = true;
    } else {
      this.log(
        "jspm/resolveLatestTarget",
        `${target.registry}:${target.name}@${range} -> MAJOR ${lookup.version}${
          parentUrl ? " [" + parentUrl + "]" : ""
        }`
      );
      await ensureBuild(this, lookup, this.fetchOpts);
      return lookup;
    }
  }
  if (stableFallback || range.isStable) {
    const minor = `${range.version.major}.${range.version.minor}`;
    let lookup = await (cache.minors[minor] ||
      (cache.minors[minor] = lookupRange.call(
        this,
        registry,
        name,
        minor,
        unstable,
        parentUrl
      )));
    // in theory a similar downgrade to the above can happen for stable prerelease ranges ~1.2.3-pre being downgraded to 1.2.2
    // this will be solved by the pkg@X.Y@ unstable minor lookup
    // Deno wat?
    if (lookup instanceof Promise) lookup = await lookup;
    if (!lookup) return null;
    this.log(
      "jspm/resolveLatestTarget",
      `${target.registry}:${target.name}@${range} -> MINOR ${lookup.version}${
        parentUrl ? " [" + parentUrl + "]" : ""
      }`
    );
    await ensureBuild(this, lookup, this.fetchOpts);
    return lookup;
  }
  return null;
}

function pkgToLookupUrl(pkg: ExactPackage, edge = false) {
  return `${cdnUrl}${pkg.registry}:${pkg.name}${
    pkg.version ? "@" + pkg.version : edge ? "@" : ""
  }`;
}

async function lookupRange(
  this: Resolver,
  registry: string,
  name: string,
  range: string,
  unstable: boolean,
  parentUrl?: string
): Promise<ExactPackage | null> {
  const { lookupCache } = getJspmCache(this);
  const url = pkgToLookupUrl({ registry, name, version: range }, unstable);
  if (lookupCache.has(url)) return lookupCache.get(url);
  const lookupPromise = (async () => {
    const version = await fetch.text(url, this.fetchOpts);
    if (version) {
      return { registry, name, version: version.trim() };
    } else {
      // not found
      const versions = await fetchVersions.call(this, name);
      const semverRange = new SemverRange(String(range) || "*", unstable);
      const version = semverRange.bestMatch(versions, unstable);

      if (version) {
        return { registry, name, version: version.toString() };
      }
      throw new JspmError(
        `Unable to resolve ${registry}:${name}@${range} to a valid version${importedFrom(
          parentUrl
        )}`
      );
    }
  })();
  lookupCache.set(url, lookupPromise);
  return lookupPromise;
}

export async function fetchVersions(
  this: Resolver,
  name: string
): Promise<string[]> {
  const { versionsCacheMap } = getJspmCache(this);
  if (versionsCacheMap.has(name)) {
    return versionsCacheMap.get(name);
  }
  const registryLookup =
    JSON.parse(
      await await fetch.text(`https://npmlookup.jspm.io/${encodeURI(name)}`, {})
    ) || {};
  const versions = Object.keys(registryLookup.versions || {});
  versionsCacheMap.set(name, versions);

  return versions;
}
