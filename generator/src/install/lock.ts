import { IImportMap } from "@jspm/import-map";
import { throwInternalError } from "../common/err.js";
import { isPlain, isURL, resolveUrl } from "../common/url.js";
import { Resolver } from "../trace/resolver.js";
import { JspmError } from "../common/err.js";
import { PackageProvider } from "./installer.js";
import {
  PackageTarget,
  newPackageTarget,
  PackageConfig,
  parsePkg,
  ExactPackage,
  ExactModule,
} from "./package.js";
// @ts-ignore
import sver from "sver";
import { getPackageConfig } from "../generator.js";
import { decodeBase64 } from "../common/b64.js";
const { Semver, SemverRange } = sver;

export interface LockResolutions {
  primary: {
    [pkgName: string]: InstalledResolution;
  };
  secondary: {
    [pkgUrl: `${string}/`]: {
      [pkgName: string]: InstalledResolution;
    };
  };

  // resolutions on non-package boundaries due to scope flattening which conflate version information
  // for example you might have separate export subpaths resolving different versions of the same package
  // FlatInstalledResolution[] captures this flattened variation of install resolutions while still
  // being keyed by the root scope + package name lookup
  flattened: {
    [scopeUrl: `${string}/`]: {
      [pkgName: string]: FlatInstalledResolution[];
    };
  };
}

interface PackageToTarget {
  [pkgName: string]: PackageTarget | URL;
}

export interface VersionConstraints {
  primary: PackageToTarget;
  secondary: {
    [pkgUrl: `${string}/`]: PackageToTarget;
  };
}

export interface InstalledResolution {
  installUrl: `${string}/`;
  installSubpath: "." | `./${string}` | null;
}

export interface FlatInstalledResolution {
  export: `.${string}`;
  resolution: InstalledResolution;
}

function enumerateParentScopes(url: `${string}/`): `${string}/`[] {
  const parentScopes: `${string}/`[] = [];
  let separatorIndex = url.lastIndexOf("/");
  const protocolIndex = url.indexOf("://") + 1;
  while (
    (separatorIndex = url.lastIndexOf("/", separatorIndex - 1)) !==
    protocolIndex
  ) {
    parentScopes.push(url.slice(0, separatorIndex + 1) as `${string}/`);
  }
  return parentScopes;
}

export function getResolution(
  resolutions: LockResolutions,
  name: string,
  pkgScope: `${string}/` | null
): InstalledResolution | null {
  if (pkgScope && !pkgScope.endsWith("/")) throwInternalError(pkgScope);
  if (!pkgScope) return resolutions.primary[name];
  const scope = resolutions.secondary[pkgScope];
  return scope?.[name] ?? null;
}

export function getFlattenedResolution(
  resolutions: LockResolutions,
  name: string,
  pkgScope: `${string}/`,
  flattenedSubpath: `.${string}`
): InstalledResolution | null {
  // no current scope -> check the flattened scopes
  const parentScopes = enumerateParentScopes(pkgScope);
  for (const scopeUrl of parentScopes) {
    if (!resolutions.flattened[scopeUrl]) continue;
    const flatResolutions = resolutions.flattened[scopeUrl][name];
    if (!flatResolutions) continue;
    for (const flatResolution of flatResolutions) {
      if (
        flatResolution.export === flattenedSubpath ||
        (flatResolution.export.endsWith("/") &&
          flattenedSubpath.startsWith(flatResolution.export))
      ) {
        return flatResolution.resolution;
      }
    }
  }
  return null;
}

export function setConstraint(
  constraints: VersionConstraints,
  name: string,
  target: PackageTarget,
  pkgScope: string | null = null
) {
  if (pkgScope === null) constraints.primary[name] = target;
  else
    (constraints.secondary[pkgScope] =
      constraints.secondary[pkgScope] || Object.create(null))[name] = target;
}

export function setResolution(
  resolutions: LockResolutions,
  name: string,
  installUrl: `${string}/`,
  pkgScope: `${string}/` | null = null,
  installSubpath: "." | `./${string}` | null = null
) {
  if (pkgScope && !pkgScope.endsWith("/")) throwInternalError(pkgScope);
  if (pkgScope === null) {
    const existing = resolutions.primary[name];
    if (
      existing &&
      existing.installUrl === installUrl &&
      existing.installSubpath === installSubpath
    )
      return false;
    resolutions.primary[name] = { installUrl, installSubpath };
    return true;
  } else {
    resolutions.secondary[pkgScope] = resolutions.secondary[pkgScope] || {};
    const existing = resolutions.secondary[pkgScope][name];
    if (
      existing &&
      existing.installUrl === installUrl &&
      existing.installSubpath === installSubpath
    )
      return false;
    resolutions.secondary[pkgScope][name] = { installUrl, installSubpath };
    return true;
  }
}

export function mergeLocks(
  resolutions: LockResolutions,
  newResolutions: LockResolutions
) {
  for (const pkg of Object.keys(newResolutions.primary)) {
    resolutions.primary[pkg] = newResolutions.primary[pkg];
  }
  for (const pkgUrl of Object.keys(newResolutions.secondary)) {
    if (resolutions[pkgUrl])
      Object.assign(
        (resolutions[pkgUrl] = Object.create(null)),
        newResolutions[pkgUrl]
      );
    else resolutions.secondary[pkgUrl] = newResolutions.secondary[pkgUrl];
  }
  for (const scopeUrl of Object.keys(newResolutions.flattened)) {
    if (resolutions[scopeUrl])
      Object.assign(resolutions[scopeUrl], newResolutions[scopeUrl]);
    else resolutions.flattened[scopeUrl] = newResolutions.flattened[scopeUrl];
  }
}

export function mergeConstraints(
  constraints: VersionConstraints,
  newConstraints: VersionConstraints
) {
  for (const pkg of Object.keys(newConstraints.primary)) {
    constraints.primary[pkg] = newConstraints.primary[pkg];
  }
  for (const pkgUrl of Object.keys(newConstraints.secondary)) {
    if (constraints[pkgUrl])
      Object.assign(
        (constraints[pkgUrl] = Object.create(null)),
        newConstraints[pkgUrl]
      );
    else constraints.secondary[pkgUrl] = newConstraints.secondary[pkgUrl];
  }
}

function toPackageTargetMap(
  pcfg: PackageConfig,
  pkgUrl: URL,
  defaultRegistry = "npm",
  includeDev = false
): PackageToTarget {
  const constraints: PackageToTarget = Object.create(null);

  if (pcfg.dependencies)
    for (const name of Object.keys(pcfg.dependencies)) {
      constraints[name] = newPackageTarget(
        pcfg.dependencies[name],
        pkgUrl,
        defaultRegistry,
        name
      ).pkgTarget;
    }

  if (pcfg.peerDependencies)
    for (const name of Object.keys(pcfg.peerDependencies)) {
      if (name in constraints) continue;
      constraints[name] = newPackageTarget(
        pcfg.peerDependencies[name],
        pkgUrl,
        defaultRegistry,
        name
      ).pkgTarget;
    }

  if (pcfg.optionalDependencies)
    for (const name of Object.keys(pcfg.optionalDependencies)) {
      if (name in constraints) continue;
      constraints[name] = newPackageTarget(
        pcfg.optionalDependencies[name],
        pkgUrl,
        defaultRegistry,
        name
      ).pkgTarget;
    }

  if (includeDev && pcfg.devDependencies)
    for (const name of Object.keys(pcfg.devDependencies)) {
      if (name in constraints) continue;
      constraints[name] = newPackageTarget(
        pcfg.devDependencies[name],
        pkgUrl,
        defaultRegistry,
        name
      ).pkgTarget;
    }

  return constraints;
}

async function packageTargetFromExact(
  pkg: ExactPackage,
  resolver: Resolver,
  permitDowngrades = false
): Promise<PackageTarget> {
  let registry: string, name: string, version: string;
  if (pkg.registry === "node_modules") {
    // The node_modules versions are always URLs to npm-installed packages:
    const pkgUrl = decodeBase64(pkg.version);
    const pcfg = await resolver.getPackageConfig(pkgUrl);
    if (!pcfg)
      throw new JspmError(
        `Package ${pkgUrl} has no package config, cannot create package target.`
      );
    if (!pcfg.name || !pcfg.version)
      throw new JspmError(
        `Package ${pkgUrl} has no name or version, cannot create package target.`
      );

    name = pcfg.name;
    version = pcfg.version;
    registry = "npm";
  } else {
    // The other registries all use semver ranges:
    ({ registry, name, version } = pkg);
  }

  const v = new Semver(version);
  if (v.tag)
    return {
      registry,
      name,
      ranges: [new SemverRange(version)],
      unstable: false,
    };
  if (permitDowngrades) {
    if (v.major !== 0)
      return {
        registry,
        name,
        ranges: [new SemverRange(v.major)],
        unstable: false,
      };
    if (v.minor !== 0)
      return {
        registry,
        name,
        ranges: [new SemverRange(v.major + "." + v.minor)],
        unstable: false,
      };
    return {
      registry,
      name,
      ranges: [new SemverRange(version)],
      unstable: false,
    };
  } else {
    return {
      registry,
      name,
      ranges: [new SemverRange("^" + version)],
      unstable: false,
    };
  }
}

export interface PackageConstraint {
  alias: string;
  pkgScope: `${string}/` | null;
  ranges: any[];
}

export function getConstraintFor(
  name: string,
  registry: string,
  constraints: VersionConstraints
): PackageConstraint[] {
  const installs: PackageConstraint[] = [];
  for (const [alias, target] of Object.entries(constraints.primary)) {
    if (
      !(target instanceof URL) &&
      target.registry === registry &&
      target.name === name
    )
      installs.push({ alias, pkgScope: null, ranges: target.ranges });
  }
  for (const [pkgScope, scope] of Object.entries(constraints.secondary)) {
    for (const alias of Object.keys(scope)) {
      const target = scope[alias];
      if (
        !(target instanceof URL) &&
        target.registry === registry &&
        target.name === name
      )
        installs.push({
          alias,
          pkgScope: pkgScope as `${string}/`,
          ranges: target.ranges,
        });
    }
  }
  return installs;
}

export async function extractLockConstraintsAndMap(
  map: IImportMap,
  preloadUrls: string[],
  mapUrl: URL,
  rootUrl: URL | null,
  defaultRegistry: string,
  resolver: Resolver,

  // TODO: we should pass the whole providers namespace here so that we can
  // enforce the user's URL-specific constraints on which provider to use:
  provider: PackageProvider
): Promise<{
  locks: LockResolutions;
  constraints: VersionConstraints;
  maps: IImportMap;
}> {
  const locks: LockResolutions = {
    primary: Object.create(null),
    secondary: Object.create(null),
    flattened: Object.create(null),
  };
  const maps: IImportMap = {
    imports: Object.create(null),
    scopes: Object.create(null),
  };

  // Primary version constraints taken from the map configuration base (if found)
  const primaryBase = await resolver.getPackageBase(mapUrl.href);
  const primaryPcfg = await resolver.getPackageConfig(primaryBase);
  const constraints: VersionConstraints = {
    primary: primaryPcfg
      ? toPackageTargetMap(
          primaryPcfg,
          new URL(primaryBase),
          defaultRegistry,
          true
        )
      : Object.create(null),
    secondary: Object.create(null),
  };

  const pkgUrls = new Set<string>();
  for (const key of Object.keys(map.imports || {})) {
    if (isPlain(key)) {
      // Get the package name and subpath in package specifier space.
      const parsedKey = parsePkg(key);

      // Get the target package details in URL space:
      let { parsedTarget, pkgUrl, subpath } = await resolveTargetPkg(
        map.imports[key],
        mapUrl,
        rootUrl,
        primaryBase,
        resolver,
        provider
      );

      const exportSubpath =
        parsedTarget &&
        (await resolver.getExportResolution(pkgUrl, subpath, key));
      pkgUrls.add(pkgUrl);

      // If the plain specifier resolves to a package on some provider's CDN,
      // and there's a corresponding import/export map entry in that package,
      // then the resolution is standard and we can lock it:
      if (exportSubpath) {
        // Package "imports" resolutions don't constrain versions.
        if (key[0] === "#") continue;

        // Otherwise we treat top-level package versions as a constraint.
        if (!constraints.primary[parsedKey.pkgName]) {
          constraints.primary[parsedKey.pkgName] = await packageTargetFromExact(
            parsedTarget.pkg,
            resolver
          );
        }

        // In the case of subpaths having diverging versions, we force convergence on one version
        // Only scopes permit unpacking
        let installSubpath: null | `./${string}/` | false = null;
        if (parsedKey.subpath !== exportSubpath) {
          if (parsedKey.subpath === ".") {
            installSubpath = exportSubpath as `./${string}/`;
          } else if (exportSubpath === ".") {
            installSubpath = false;
          } else if (exportSubpath.endsWith(parsedKey.subpath.slice(1))) {
            installSubpath = exportSubpath.slice(
              0,
              parsedKey.subpath.length
            ) as `./${string}/`;
          }
        }
        if (installSubpath !== false) {
          setResolution(locks, parsedKey.pkgName, pkgUrl, null, installSubpath);
          continue;
        }
      }

      // Another possibility is that the bare specifier is a remapping for the
      // primary package's own-name, in which case we should check whether
      // there's a corresponding export in the primary pjson:
      if (primaryPcfg && primaryPcfg.name === parsedKey.pkgName) {
        const exportSubpath = await resolver.getExportResolution(
          primaryBase,
          subpath,
          key
        );

        // If the export subpath matches the key's subpath, then this is a
        // standard resolution:
        if (parsedKey.subpath === exportSubpath) continue;
      }
    }

    // Fallback - this resolution is non-standard, so we need to record it as
    // a custom import override:
    maps.imports[isPlain(key) ? key : resolveUrl(key, mapUrl, rootUrl)] =
      resolveUrl(map.imports[key], mapUrl, rootUrl);
  }

  for (const scopeUrl of Object.keys(map.scopes || {})) {
    const resolvedScopeUrl = resolveUrl(scopeUrl, mapUrl, rootUrl) ?? scopeUrl;
    const scopePkgUrl = await resolver.getPackageBase(resolvedScopeUrl);
    const flattenedScope = new URL(scopePkgUrl).pathname === "/";
    pkgUrls.add(scopePkgUrl);

    const scope = map.scopes[scopeUrl];
    for (const key of Object.keys(scope)) {
      if (isPlain(key)) {
        // Get the package name and subpath in package specifier space.
        const parsedKey = parsePkg(key);

        // Get the target package details in URL space:
        let { parsedTarget, pkgUrl, subpath } = await resolveTargetPkg(
          scope[key],
          mapUrl,
          rootUrl,
          scopePkgUrl,
          resolver,
          provider
        );

        pkgUrls.add(pkgUrl);
        const exportSubpath =
          parsedTarget &&
          (await resolver.getExportResolution(pkgUrl, subpath, key));

        // TODO: we don't handle trailing-slash mappings here at all, which
        // leads to them sticking around in the import map as custom
        // resolutions forever.

        if (exportSubpath) {
          // Imports resolutions that resolve as expected can be skipped
          if (key[0] === "#") continue;

          // If there is no constraint, we just make one as the semver major on the current version
          if (!constraints.primary[parsedKey.pkgName])
            constraints.primary[parsedKey.pkgName] = parsedTarget
              ? await packageTargetFromExact(parsedTarget.pkg, resolver)
              : new URL(pkgUrl);

          // In the case of subpaths having diverging versions, we force convergence on one version
          // Only scopes permit unpacking
          let installSubpath: null | "." | "./" | `./${string}/` | false = null;
          if (parsedKey.subpath !== exportSubpath) {
            if (parsedKey.subpath === ".") {
              installSubpath = exportSubpath as `./${string}/`;
            } else if (exportSubpath === ".") {
              installSubpath = false;
            } else {
              if (exportSubpath.endsWith(parsedKey.subpath.slice(1)))
                installSubpath = exportSubpath.slice(
                  0,
                  parsedKey.subpath.length
                ) as `./${string}/`;
            }
          }
          if (installSubpath !== false) {
            if (flattenedScope) {
              const flattened = (locks.flattened[scopePkgUrl] =
                locks.flattened[scopePkgUrl] || {});
              flattened[parsedKey.pkgName] = flattened[parsedKey.pkgName] || [];
              flattened[parsedKey.pkgName].push({
                export: parsedKey.subpath,
                resolution: { installUrl: pkgUrl, installSubpath },
              });
            } else {
              setResolution(
                locks,
                parsedKey.pkgName,
                pkgUrl,
                scopePkgUrl,
                installSubpath
              );
            }
            continue;
          }
        }
      }
      // Fallback -> Custom import with normalization
      (maps.scopes[resolvedScopeUrl] =
        maps.scopes[resolvedScopeUrl] || Object.create(null))[
        isPlain(key) ? key : resolveUrl(key, mapUrl, rootUrl)
      ] = resolveUrl(scope[key], mapUrl, rootUrl);
    }
  }

  // for every package we resolved, add their package constraints into the list of constraints
  await Promise.all(
    [...pkgUrls].map(async (pkgUrl) => {
      if (!isURL(pkgUrl)) return;
      const pcfg = await getPackageConfig(pkgUrl);
      if (pcfg)
        constraints.secondary[pkgUrl] = toPackageTargetMap(
          pcfg,
          new URL(pkgUrl),
          defaultRegistry,
          false
        );
    })
  );

  // TODO: allow preloads to inform used versions somehow
  // for (const url of preloadUrls) {
  //   const resolved = resolveUrl(url, mapUrl, rootUrl).href;
  //   const providerPkg = resolver.parseUrlPkg(resolved);
  //   if (providerPkg) {
  //     const pkgUrl = await resolver.getPackageBase(mapUrl.href);
  //   }
  // }

  return {
    maps,
    constraints,
    locks: await enforceProviderConstraints(
      locks,
      provider,
      resolver,
      primaryBase
    ),
  };
}

/**
 * Enforces the user's provider constraints, which map subsets of URL-space to
 * the provider that should be used to resolve them. Constraints are enforced
 * by re-resolving every input map lock and constraint against the provider
 * for their parent package URL.
 * TODO: actually handle provider constraints
 */
async function enforceProviderConstraints(
  locks: LockResolutions,
  provider: PackageProvider,
  resolver: Resolver,
  basePkgUrl: `${string}/`
) {
  const res: LockResolutions = {
    primary: {},
    secondary: {},
    flattened: {},
  };

  for (const [pkgName, lock] of Object.entries(locks.primary)) {
    const { installUrl, installSubpath } = await translateLock(
      lock,
      provider,
      resolver,
      basePkgUrl
    );
    setResolution(res, pkgName, installUrl, null, installSubpath);
  }
  for (const [pkgUrl, pkgLocks] of Object.entries(locks.secondary)) {
    for (const [pkgName, lock] of Object.entries(pkgLocks)) {
      const { installUrl, installSubpath } = await translateLock(
        lock,
        provider,
        resolver,
        pkgUrl as `${string}/`
      );
      setResolution(
        res,
        pkgName,
        installUrl,
        pkgUrl as `${string}/`,
        installSubpath
      );
    }
  }
  for (const [scopeUrl, pkgLocks] of Object.entries(locks.flattened)) {
    res.flattened[scopeUrl] = {};
    for (const [pkgName, locks] of Object.entries(pkgLocks)) {
      res.flattened[scopeUrl][pkgName] = [];
      for (const lock of locks) {
        const newLock = await translateLock(
          lock.resolution,
          provider,
          resolver,
          scopeUrl as `${string}/`
        );
        res.flattened[scopeUrl][pkgName].push({
          export: lock.export,
          resolution: newLock,
        });
      }
    }
  }

  return res;
}

async function translateLock(
  lock: InstalledResolution,
  provider: PackageProvider,
  resolver: Resolver,
  parentUrl: `${string}/`
): Promise<InstalledResolution> {
  const mdl = await resolver.parseUrlPkg(lock.installUrl);
  if (!mdl) return lock; // no provider owns it, nothing to translate

  const parentPkgUrl = await resolver.getPackageBase(parentUrl);
  const newMdl = await translateProvider(mdl, provider, resolver, parentPkgUrl);
  if (!newMdl) {
    // TODO: we should throw here once parent scoping is implemented
    // throw new JspmError(
    //   `Failed to translate ${lock.installUrl} to provider ${provider.provider}.`
    // );
    return lock;
  }

  return {
    installUrl: await resolver.pkgToUrl(newMdl.pkg, provider),
    installSubpath: lock.installSubpath,
  };
}

export async function translateProvider(
  mdl: ExactModule,
  { provider, layer }: PackageProvider,
  resolver: Resolver,
  parentUrl: string
): Promise<ExactModule | null> {
  const pkg = mdl.pkg;
  if (
    (pkg.registry === "deno" || pkg.registry === "denoland") &&
    provider === "deno"
  ) {
    return mdl; // nothing to do if translating deno-to-deno
  } else if (
    pkg.registry === "deno" ||
    pkg.registry === "denoland" ||
    provider === "deno"
  ) {
    // TODO: we should throw here once parent scoping is implemented
    // throw new JspmError(
    //   "Cannot translate packages between the 'deno' provider and other providers."
    // );
    return null;
  }

  const fromNodeModules = pkg.registry === "node_modules";
  const toNodeModules = provider === "nodemodules";
  if (fromNodeModules === toNodeModules) {
    return {
      ...mdl,
      source: { provider, layer },
    };
  }

  const target = await packageTargetFromExact(pkg, resolver);
  let latestPkg: ExactPackage;
  try {
    latestPkg = await resolver.resolveLatestTarget(
      target,
      { provider, layer },
      parentUrl
    );
  } catch (err) {
    // TODO: we should throw here once parent scoping is implemented
    // throw new JspmError(
    //   `Failed to translate package ${pkg.name}@${pkg.version} to provider ${provider}.`
    // );
    return null;
  }

  return {
    pkg: latestPkg,
    source: { provider, layer },
    subpath: mdl.subpath,
  };
}

async function resolveTargetPkg(
  moduleUrl: string,
  mapUrl: URL,
  rootUrl: URL,
  parentUrl: `${string}/`,
  resolver: Resolver,
  provider: PackageProvider
) {
  let targetUrl = resolveUrl(moduleUrl, mapUrl, rootUrl);
  let parsedTarget = await resolver.parseUrlPkg(targetUrl);
  let pkgUrl = parsedTarget
    ? await resolver.pkgToUrl(parsedTarget.pkg, parsedTarget.source)
    : await resolver.getPackageBase(targetUrl);
  const subpath = ("." + targetUrl.slice(pkgUrl.length - 1)) as
    | "."
    | `./${string}`;

  return { parsedTarget, pkgUrl, subpath };
}
