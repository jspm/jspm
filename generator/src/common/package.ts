import type { ExportsTarget } from '../install/package.js';

export function getMapMatch<T = any>(
  specifier: string,
  map: Record<string, T>
): string | undefined {
  if (specifier in map) return specifier;
  let bestMatch;
  for (const match of Object.keys(map)) {
    const wildcardIndex = match.indexOf('*');
    if (!match.endsWith('/') && wildcardIndex === -1) continue;
    if (match.endsWith('/')) {
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
        if (!bestMatch || !bestMatch.startsWith(prefix) || !bestMatch.endsWith(suffix))
          bestMatch = match;
      }
    }
  }
  return bestMatch;
}

// Cache for allDotKeys results - same exports object is checked multiple times
const allDotKeysCache = new WeakMap<Record<string, any>, boolean>();

export function allDotKeys(exports: Record<string, any>): boolean {
  const cached = allDotKeysCache.get(exports);
  if (cached !== undefined) return cached;

  for (let p in exports) {
    if (p[0] !== '.') {
      allDotKeysCache.set(exports, false);
      return false;
    }
  }
  allDotKeysCache.set(exports, true);
  return true;
}

/**
 * Get the set of export subpath prefixes that can be losslessly collapsed
 * into trailing-slash import map entries.
 *
 * A wildcard export like `"./modules/*": "./modules/*"` can be represented
 * as `pkg/modules/` → `base/modules/` without expanding individual files.
 * Suffix wildcards like `"./foo/*.js": "./src/*.js"` are only eligible if
 * all files under the target prefix match the suffix (no file leakage).
 */
export function getWildcardPrefixes(
  exports: ExportsTarget | Record<string, ExportsTarget>,
  env: string[],
  files?: Set<string>
): Set<string> {
  const prefixes = new Set<string>();
  if (typeof exports !== 'object' || exports === null || !allDotKeys(exports)) return prefixes;

  for (const subpath of Object.keys(exports)) {
    if (subpath.indexOf('*') === -1) continue;
    let targetList = new Set<string>();
    resolveTargetResolution((exports as Record<string, ExportsTarget>)[subpath], env, targetList);
    for (const target of targetList) {
      if (!target.startsWith('./') || target.indexOf('*') === -1) continue;
      const targetSuffix = target.slice(target.indexOf('*') + 1);
      const subpathSuffix = subpath.slice(subpath.indexOf('*') + 1);
      if (subpathSuffix !== targetSuffix) continue;
      const subpathPrefix = subpath.slice(0, subpath.indexOf('*'));
      const targetPrefix = target.slice(2, target.indexOf('*'));
      // For empty suffixes (trailing wildcard), always safe.
      // For non-empty suffixes, verify all files under the target prefix match
      // the suffix so the trailing-slash mapping doesn't over-match.
      if (files && subpathSuffix) {
        let safe = true;
        for (const f of files) {
          if (f.startsWith(targetPrefix) && !f.endsWith(subpathSuffix)) {
            safe = false;
            break;
          }
        }
        if (!safe) continue;
      }
      prefixes.add(subpathPrefix);
    }
  }
  return prefixes;
}

/**
 * Resolve an exports target to the single resolution it takes for the given env,
 * matching the strict Node conditional resolution of Resolver.resolvePackageTarget.
 * Conditions outside the env never resolve, so a target reachable only through
 * them is not enumerated.
 */
function resolveTargetResolution(
  target: ExportsTarget,
  env: string[],
  targetList: Set<string>
): boolean {
  if (typeof target === 'string') {
    if (target.startsWith('./')) targetList.add(target);
    return true;
  }
  if (Array.isArray(target)) {
    for (const item of target) {
      if (resolveTargetResolution(item, env, targetList)) return true;
    }
    return false;
  }
  // the null resolution target is a match for not resolving
  if (target === null) return true;
  for (const condition of Object.keys(target)) {
    if (condition.startsWith('.')) continue;
    if (condition === 'default' || env.includes(condition)) {
      if (resolveTargetResolution(target[condition], env, targetList)) return true;
    }
  }
  return false;
}

/**
 * Expand a package exports field into its set of subpaths and resolution
 * With an optional file list for expanding globs
 */
export function expandExportsResolutions(
  exports: ExportsTarget | Record<string, ExportsTarget>,
  env: string[],
  files?: Set<string> | undefined,
  exportsResolutions: Map<string, string> = new Map()
) {
  if (typeof exports !== 'object' || exports === null || !allDotKeys(exports)) {
    let targetList = new Set<string>();
    resolveTargetResolution(exports, env, targetList);
    for (const target of targetList) {
      if (target.startsWith('./')) exportsResolutions.set('.', target.slice(2));
    }
  } else {
    for (const subpath of Object.keys(exports)) {
      let targetList = new Set<string>();
      resolveTargetResolution((exports as Record<string, ExportsTarget>)[subpath], env, targetList);
      for (const target of targetList) {
        expandExportsTarget(
          exports as Record<string, ExportsTarget>,
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
 * Expands the given target string into the entries list,
 * handling wildcard globbing
 */
function expandExportsTarget(
  exports: Record<string, ExportsTarget>,
  subpath: string,
  target: string,
  files: Set<string> | undefined,
  entriesMap: Map<string, string>
) {
  if (!target.startsWith('./') || !(subpath.startsWith('./') || subpath === '.')) return;
  if (target.indexOf('*') === -1 || subpath.indexOf('*') === -1) {
    entriesMap.set(subpath, target.slice(2));
    return;
  }
  if (!files) return;

  // Build a regex from the target where the first * becomes a capturing group
  // and any subsequent *s become backreferences, enforcing that all wildcards
  // match the same value (per Node.js exports semantics).
  // See https://nodejs.org/api/packages.html#subpath-patterns
  const regexPattern = target
    .slice(2)
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace('*', '(.+)')
    .replaceAll('*', '\\1');
  const targetRegex = new RegExp(`^${regexPattern}$`);

  // For each file that matches the target pattern, extract the wildcard value,
  // re-resolve the subpath to verify it isn't shadowed by a more specific export.
  for (const file of files) {
    const match = file.match(targetRegex);
    if (!match) continue;
    const pattern = match[1];

    const originalSubpath = subpath.replace('*', pattern);
    const matchedSubpath = getMapMatch(originalSubpath, exports);
    if (matchedSubpath === subpath) entriesMap.set(originalSubpath, file);
  }
}
