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
    expandTargetResolutions(exports[subpath], files, env, targetList, [], true);
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
    expandTargetResolutions(exports, files, env, targetList, [], true);
    for (const target of targetList) {
      if (target.startsWith('./')) {
        const targetFile = target.slice(2);
        if (!files || files.has(targetFile)) exportsResolutions.set('.', targetFile);
      }
    }
  } else {
    for (const subpath of Object.keys(exports)) {
      let targetList = new Set<string>();
      expandTargetResolutions(exports[subpath], files, env, targetList, [], true);
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
 * Expand a package exports field into a list of entry points
 * With an optional file list for expanding globs
 */
export function expandExportsEntries(
  exports: ExportsTarget | Record<string, ExportsTarget>,
  env: string[],
  files?: Set<string> | undefined,
  entriesList: Set<string> = new Set()
) {
  if (typeof exports !== 'object' || exports === null || !allDotKeys(exports)) {
    let targetList = new Set<string>();
    expandTargetResolutions(exports, files, env, targetList, [], false);
    for (const target of targetList) {
      if (target.startsWith('./')) {
        const targetFile = target.slice(2);
        if (!files || files.has(targetFile)) entriesList.add(targetFile);
      }
    }
  } else {
    for (const subpath of Object.keys(exports)) {
      let targetList = new Set<string>();
      expandTargetResolutions(exports[subpath], files, env, targetList, [], false);
      for (const target of targetList) {
        let map = new Map();
        expandExportsTarget(exports as Record<string, ExportsTarget>, subpath, target, files, map);
        for (const entry of map.values()) {
          entriesList.add(entry);
        }
      }
    }
  }
}

/**
 * Expand the given exports target into its possible resolution list,
 * given an environment union.
 * Unknown environment conditions are expanded, with handling for
 * mutual exclusions between environment conditions - i.e. if env is [], and we
 * expand into a "production" branch of the environment, then "development" branches
 * will be excluded on that walk of the branch further.
 */
const conditionMutualExclusions = {
  production: 'development',
  development: 'production',
  import: 'require',
  require: 'import'
};
function expandTargetResolutions(
  exports: ExportsTarget,
  files: Set<string> | undefined,
  env: string[],
  targetList: Set<string>,
  envExclusions = env.map(condition => conditionMutualExclusions[condition]).filter(c => c),
  firstOnly: boolean
): boolean {
  if (typeof exports === 'string') {
    if (exports.startsWith('./')) targetList.add(exports);
    return true;
  } else if (Array.isArray(exports)) {
    for (const item of exports) {
      if (expandTargetResolutions(item, files, env, targetList, envExclusions, firstOnly))
        return true;
    }
    return false;
  } else if (exports === null) {
    // the null resolution target is a match for not resolving
    return true;
  } else {
    let hasSomeResolution = false;
    for (const condition of Object.keys(exports)) {
      if (condition.startsWith('.')) continue;
      if (condition === 'default' || env.includes(condition)) {
        if (
          expandTargetResolutions(
            exports[condition],
            files,
            env,
            targetList,
            envExclusions,
            firstOnly
          )
        ) {
          return true;
        }
      }
      if (envExclusions.includes(condition)) continue;
      const maybeNewExclusion = conditionMutualExclusions[condition];
      const newExclusions =
        maybeNewExclusion && !envExclusions.includes(maybeNewExclusion)
          ? [...envExclusions, maybeNewExclusion]
          : envExclusions;
      // if we did match the condition, then we know any subsequent condition checks are under exclusion as well
      if (
        expandTargetResolutions(
          exports[condition],
          files,
          env,
          targetList,
          newExclusions,
          firstOnly
        )
      ) {
        if (firstOnly) return true;
        hasSomeResolution = true;
        envExclusions = newExclusions;
      }
    }
    return hasSomeResolution;
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
    const targetFile = target.slice(2);
    if (!files || files.has(targetFile)) entriesMap.set(subpath, target.slice(2));
    return;
  }
  if (!files) return;

  // Build a regex from the target where the first * becomes a capturing group
  // and any subsequent *s become backreferences, enforcing that all wildcards
  // match the same value (per Node.js exports semantics).
  // See https://nodejs.org/api/packages.html#subpath-patterns
  const regexPattern = target.slice(2)
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
