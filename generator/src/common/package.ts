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

export function allDotKeys(exports: Record<string, any>) {
  for (let p in exports) {
    if (p[0] !== '.') return false;
  }
  return true;
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

  // First determine the list of files that could match the target glob
  const lhs = target.slice(2, target.indexOf('*'));
  const rhs = target.slice(target.indexOf('*') + 1);

  const fileMatches = new Set<string>();
  for (const file of files) {
    if (file.startsWith(lhs) && file.endsWith(rhs) && file.length > lhs.length + rhs.length) {
      fileMatches.add(file);
    }
  }

  // Backtrack to determine their original subpaths and
  // re-resolve those subpaths to verify they do indeed resolve to our target glob
  // since they could be shadowed by other subpath resolutions
  for (const fileMatch of fileMatches) {
    const pattern = fileMatch.slice(lhs.length, fileMatch.length - rhs.length);
    const originalSubpath = subpath.replace('*', pattern);
    const matchedSubpath = getMapMatch(originalSubpath, exports);
    if (matchedSubpath === subpath) entriesMap.set(originalSubpath, fileMatch);
  }
}
