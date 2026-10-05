import { toast } from './toast.js';

let crypto, Semver, Generator, lookup, getPackageConfig, generator;
const initPromise = (async () => {
  [
    { Semver },
    { Generator, lookup, getPackageConfig },
    { default: crypto },
  ] = await Promise.all([
    import('sver'),
    import('@jspm/generator'),
    import('@jspm/core/nodelibs/crypto'),
  ]);
})();

const integrityCache = new Map();
export async function getIntegrity (url) {
  if (integrityCache.has(url))
    return integrityCache.get(url);
  const res = await fetch(url);
  const buf = await res.text();
  const hash = crypto.createHash('sha384');
  hash.update(buf);
  const integrity = 'sha384-' + hash.digest('base64');
  integrityCache.set(url, integrity);
  return integrity;
}

let urlCache = {};

export async function getESModuleShimsScript (integrity, provider) {
  let esmsUrl = urlCache['esms-' + provider];
  if (!esmsUrl) {
    const { resolved } = await lookup('es-module-shims', { provider });
    const generator = new Generator({ defaultProvider: provider });
    esmsUrl = (await generator.traceMap.resolver.pm.pkgToUrl(resolved, provider)) + "dist/es-module-shims.js";
    urlCache['esms-' + provider] = esmsUrl;
  }
  // esm.sh gives a redirect URL so we need to rewrite it
  if (provider === 'esm.sh') {
    const esmsRedirect = await (await fetch(esmsUrl)).text();
    esmsUrl = esmsRedirect.match(/\"([^\"]+)\"/)[1];
  }
  return [{
    async: true,
    url: esmsUrl,
    integrity: integrity ? await getIntegrity(esmsUrl) : '',
    crossorigin: true,
    comment: 'ES Module Shims import maps polyfills'
  }];
}

export async function getMap (deps, integrity, doPreload, env, provider) {
  await initPromise;
  generator = new Generator({
    env: Object.keys(env).filter(key => env[key]),
    defaultProvider: provider,
    integrity,
    expandWildcards: true,
  });

  // the static graph always takes preload priority
  const staticPreloads = new Set();
  const dynPreloads = new Set();

  for (const [dep, preload] of deps) {
    const { staticDeps, dynamicDeps } = await generator.install(dep);
    if (doPreload && preload) {
      for (const url of [...staticDeps])
        staticPreloads.add(url);
      for (const url of [...dynamicDeps])
        dynPreloads.add(url);
    }
  }

  const map = generator.getMap();
  map.imports = map.imports || {};

  for (const url of staticPreloads) {
    if (dynPreloads.has(url))
      dynPreloads.delete(url);
  }

  const preloads = await Promise.all([
    ...[...staticPreloads].sort(),
    ...[...dynPreloads].sort()
  ].map(async url => {
    return { url };
  }));
  return { map, preloads };
}

export async function resolvePkg (depStr) {
  await initPromise;
  if (depStr === 'err')
    return { err: `Unable to find package ${depStr}` };
  try {
    var { install, resolved } = await lookup(depStr);
  }
  catch (e) {
    return { err: e.message };
  }
  if (install.alias !== resolved.name)
    return { err: 'Invalid name format' };
  try {
    return { subpath: install.subpath, ...resolved };
  }
  catch (e) {
    return { err: e.message };
  }
}

export async function getVersions (name) {
  await initPromise;
  const res = await fetch(`https://npmlookup.jspm.io/${encodeURIComponent(name)}`);
  if (!res.ok) {
    toast(`Error: Unable to get version list for ${name} (${res.status})`);
    return;
  }
  const json = await res.json();
  return Object.entries(json.versions).filter(([version, entry]) => !('deprecated' in entry)).map(([version, entry]) => version).sort(Semver.compare).reverse();
}

export async function getExports (name, version) {
  await initPromise;
  const pcfg = await getPackageConfig(`https://ga.jspm.io/npm:${name}@${version}/`);
  if (!pcfg)
    toast(`Error: Unable to load package configuration for ${name}@${version}.`);
  else
    return Object.keys(pcfg.exports).filter(expt => !expt.endsWith('!cjs') && !expt.endsWith('/') && expt.indexOf('*') === -1).sort();
}

export async function installFromDependencies(deps) {
  await initPromise;
  const installedDeps = [];

  // resolve dependency names and versions
  const progressBar = document.querySelector('progress-bar.main');
  progressBar.setEstimate(10000);

  for (let [name, range] of Object.entries(deps)) {
    let version;
    // latest version lookup
    if (range === '*' || range === 'latest' || range.startsWith('^') || range.startsWith('~')) {
      let err;
      ({ name, version, err } = await resolvePkg(name + '@' + range));
      if (err)
        throw err;
    }
    // invalid registry pointer
    else if (range.includes(':')) {
      throw new Error(`Alternative registry references not supported, installing ${name} = ${range}`);
    }
    // exact version / tag
    else {
      version = range;
    }
    progressBar.addWork();
    installedDeps.push([name + '@' + version]);
  }

  progressBar.complete();
  return installedDeps;
}
