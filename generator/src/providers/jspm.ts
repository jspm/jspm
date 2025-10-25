import { JspmError } from '../common/err.js';
import { importedFrom } from '../common/url.js';
import type { LatestPackageTarget, PackageConfig } from '../install/package.js';
import { pkgToStr } from '../install/package.js';
import type { ExactPackage } from '../install/package.js';
import type { ImportMap } from '@jspm/import-map';
// @ts-ignore
import { SemverRange } from 'sver';
// @ts-ignore
import { fetch } from '../common/fetch.js';
import type { PublishOutput, ProviderContext } from './index.js';
import type { Resolver } from '../trace/resolver.js';

let gaUrl = 'https://ga.jspm.io/';
const systemCdnUrl = 'https://ga.system.jspm.io/';
let apiUrl = 'https://api.jspm.io/';

// the URL we PUT the jspm.io publish to
let publishUrl = 'https://dev.qitkao.com/';

// the URL the published jspm.io packages can be seen
let rawUrl = 'https://jspm.io/';

let authToken;

const BUILD_POLL_TIME = 60 * 1000;
const BUILD_POLL_INTERVAL = 5 * 1000;
const AUTH_POLL_INTERVAL = 5 * 1000; // 5 seconds between auth polls

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

export const supportedLayers = ['default', 'system'];

function withTrailer(url: string) {
  return url.endsWith('/') ? url : url + '/';
}

export function pkgToUrl(pkg: ExactPackage, layer = 'default'): `${string}/` {
  if (pkg.registry === 'app') return `${rawUrl}${pkgToStr(pkg)}/`;
  return `${layer === 'system' ? systemCdnUrl : gaUrl}${pkgToStr(pkg)}/`;
}

export async function getPackageConfig(
  this: ProviderContext,
  pkgUrl: string
): Promise<PackageConfig | null> {
  if (pkgUrl === gaUrl) return null;
  try {
    var res = await fetch(`${pkgUrl}package.json`, this.fetchOpts);
  } catch (e) {
    return null;
  }
  switch (res.status) {
    case 200:
    case 204:
    case 304:
      break;
    case 400:
    case 401:
    case 403:
    case 404:
      let err;
      try {
        // if it is a build error, try surface the build error
        err = await (await fetch(`${pkgUrl}_error.log`)).text();
      } catch {}
      if (err) throw new JspmError(err);
    case 406:
    case 500:
      return null;
    default:
      throw new JspmError(
        `Invalid status code ${res.status} reading package config for ${pkgUrl}. ${res.statusText}`
      );
  }
  if (res.headers && !res.headers.get('Content-Type')?.match(/^application\/json(;|$)/)) {
    return null;
  } else {
    try {
      return (await res.json()) as PackageConfig;
    } catch (e) {
      return null;
    }
  }
}

export function configure(config: any) {
  if (config.authToken) authToken = config.authToken;
  if (config.cdnUrl) gaUrl = withTrailer(config.cdnUrl);
  if (config.publishUrl) publishUrl = withTrailer(config.publishUrl);
  if (config.rawUrl) rawUrl = withTrailer(config.rawUrl);
  if (config.apiUrl) apiUrl = withTrailer(config.apiUrl);
}

const exactPkgRegEx = /^(([a-z]+):)?((?:@[^/\\%@]+\/)?[^./\\%@][^/\\%@]*)@([^\/]+)(\/.*)?$/;

export function parseUrlPkg(url: string) {
  let subpath = null;
  let layer: string;
  if (url.startsWith(gaUrl)) layer = 'default';
  else if (url.startsWith(systemCdnUrl)) layer = 'system';
  else return;
  const [, , registry, name, version] =
    url.slice((layer === 'default' ? gaUrl : systemCdnUrl).length).match(exactPkgRegEx) || [];
  if (registry && name && version) {
    if (registry === 'npm' && name === '@jspm/core' && url.includes('/nodelibs/')) {
      subpath = `./nodelibs/${url.slice(url.indexOf('/nodelibs/') + 10).split('/')[1]}`;
      if (subpath && subpath.endsWith('.js')) subpath = subpath.slice(0, -3);
      else subpath = null;
    }
    return { pkg: { registry, name, version }, layer, subpath };
  }
}

function getJspmCache(context: ProviderContext): JspmCache {
  const jspmCache = context.context.jspmCache;
  if (!context.context.jspmCache) {
    return (context.context.jspmCache = {
      lookupCache: new Map(),
      versionsCacheMap: new Map(),
      resolveCache: {},
      cachedErrors: new Map(),
      buildRequested: new Map()
    });
  }
  return jspmCache;
}

async function checkBuildOrError(
  context: ProviderContext,
  pkgUrl: string,
  fetchOpts: any,
  resolver: Resolver | null
): Promise<boolean> {
  // For backward compatibility, assuming we have an outer resolver that can handle this
  // In a fully refactored system, this would likely come from a different method
  const pcfg = (await resolver?.getPackageConfig(pkgUrl)) || (await fetch(pkgUrl + 'package.json'));
  if (pcfg) {
    return true;
  }
  const { cachedErrors } = getJspmCache(context);
  // no package.json! Check if there's a build error:
  if (cachedErrors.has(pkgUrl)) return cachedErrors.get(pkgUrl);

  const cachedErrorPromise = (async () => {
    try {
      const errLog = await getTextIfOk(`${pkgUrl}/_error.log`, fetchOpts);
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
  context: ProviderContext,
  pkg: ExactPackage,
  fetchOpts: any,
  resolver: Resolver | null
) {
  if (await checkBuildOrError(context, pkgToUrl(pkg, 'default'), fetchOpts, resolver)) return;

  const fullName = `${pkg.name}@${pkg.version}`;

  const { buildRequested } = getJspmCache(context);

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
      await new Promise(resolve => setTimeout(resolve, BUILD_POLL_INTERVAL));

      if (await checkBuildOrError(context, pkgToUrl(pkg, 'default'), fetchOpts, resolver)) return;

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
  this: ProviderContext,
  target: LatestPackageTarget,
  layer: string,
  parentUrl: string,
  resolver: Resolver | null
): Promise<ExactPackage | null> {
  const { registry, name, range, unstable } = target;

  // exact version optimization
  if (range.isExact && !range.version.tag) {
    const pkg = { registry, name, version: range.version.toString() };
    await ensureBuild(this, pkg, this.fetchOpts, resolver);
    return pkg;
  }

  const { resolveCache } = getJspmCache(this);

  const cache = (resolveCache[target.registry + ':' + target.name] = resolveCache[
    target.registry + ':' + target.name
  ] || {
    latest: null,
    majors: Object.create(null),
    minors: Object.create(null),
    tags: Object.create(null)
  });

  if (range.isWildcard || (range.isExact && range.version.tag === 'latest')) {
    let lookup = await (cache.latest ||
      (cache.latest = lookupRange.call(this, registry, name, '', unstable, parentUrl)));
    // Deno wat?
    if (lookup instanceof Promise) lookup = await lookup;
    if (!lookup) return null;
    this.log(
      'jspm/resolveLatestTarget',
      `${target.registry}:${target.name}@${range} -> WILDCARD ${lookup.version}${
        parentUrl ? ' [' + parentUrl + ']' : ''
      }`
    );
    await ensureBuild(this, lookup, this.fetchOpts, resolver);
    return lookup;
  }
  if (range.isExact && range.version.tag) {
    const tag = range.version.tag;
    let lookup = await (cache.tags[tag] ||
      (cache.tags[tag] = lookupRange.call(this, registry, name, tag, unstable, parentUrl)));
    // Deno wat?
    if (lookup instanceof Promise) lookup = await lookup;
    if (!lookup) return null;
    this.log(
      'jspm/resolveLatestTarget',
      `${target.registry}:${target.name}@${range} -> TAG ${tag}${
        parentUrl ? ' [' + parentUrl + ']' : ''
      }`
    );
    await ensureBuild(this, lookup, this.fetchOpts, resolver);
    return lookup;
  }
  let stableFallback = false;
  if (range.isMajor) {
    const major = range.version.major;
    let lookup = await (cache.majors[major] ||
      (cache.majors[major] = lookupRange.call(this, registry, name, major, unstable, parentUrl)));
    // Deno wat?
    if (lookup instanceof Promise) lookup = await lookup;
    if (!lookup) return null;
    // if the latest major is actually a downgrade, use the latest minor version (fallthrough)
    // note this might miss later major prerelease versions, which should strictly be supported via a pkg@X@ unstable major lookup
    if (range.version.gt(lookup.version)) {
      stableFallback = true;
    } else {
      this.log(
        'jspm/resolveLatestTarget',
        `${target.registry}:${target.name}@${range} -> MAJOR ${lookup.version}${
          parentUrl ? ' [' + parentUrl + ']' : ''
        }`
      );
      await ensureBuild(this, lookup, this.fetchOpts, resolver);
      return lookup;
    }
  }
  if (stableFallback || range.isStable) {
    const minor = `${range.version.major}.${range.version.minor}`;
    let lookup = await (cache.minors[minor] ||
      (cache.minors[minor] = lookupRange.call(this, registry, name, minor, unstable, parentUrl)));
    // in theory a similar downgrade to the above can happen for stable prerelease ranges ~1.2.3-pre being downgraded to 1.2.2
    // this will be solved by the pkg@X.Y@ unstable minor lookup
    // Deno wat?
    if (lookup instanceof Promise) lookup = await lookup;
    if (!lookup) return null;
    this.log(
      'jspm/resolveLatestTarget',
      `${target.registry}:${target.name}@${range} -> MINOR ${lookup.version}${
        parentUrl ? ' [' + parentUrl + ']' : ''
      }`
    );
    await ensureBuild(this, lookup, this.fetchOpts, resolver);
    return lookup;
  }
  return null;
}

function pkgToLookupUrl(pkg: ExactPackage, edge = false) {
  return `${gaUrl}${pkg.registry}:${pkg.name}${pkg.version ? '@' + pkg.version : edge ? '@' : ''}`;
}

async function lookupRange(
  this: ProviderContext,
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
    const version = await getTextIfOk(url, this.fetchOpts);
    if (version) {
      return { registry, name, version: version.trim() };
    } else {
      // not found
      const versions = await fetchVersions.call(this, name);
      const semverRange = new SemverRange(String(range) || '*', unstable);
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

async function getTextIfOk(url, fetchOpts): Promise<string | null> {
  const res = await fetch(url, fetchOpts);
  switch (res.status) {
    case 200:
    case 304:
      return await res.text();
    // not found = null
    case 404:
      return null;
    default:
      throw new Error(`Invalid status code ${res.status}`);
  }
}

export async function fetchVersions(this: ProviderContext, name: string): Promise<string[]> {
  const { versionsCacheMap } = getJspmCache(this);
  if (versionsCacheMap.has(name)) {
    return versionsCacheMap.get(name);
  }
  const registryLookup =
    JSON.parse(await getTextIfOk(`https://npmlookup.jspm.io/${encodeURI(name)}`, {})) || {};
  const versions = Object.keys(registryLookup.versions || {});
  versionsCacheMap.set(name, versions);

  return versions;
}

export async function download(
  this: ProviderContext,
  pkg: ExactPackage
): Promise<Record<string, Uint8Array>> {
  const tar = await import('tar-stream');
  const { default: pako } = await import('pako');

  const { name, version, registry } = pkg;
  if (registry !== 'app')
    throw new JspmError(
      `The JSPM provider currently only supports downloading from the jspm.io "app:" registry`
    );
  let tarball: ArrayBuffer;
  try {
    const tarballRes = await fetch(`${rawUrl}tarball/app:${name}@${version}`);
    if (tarballRes.ok) {
      tarball = await tarballRes.arrayBuffer();
    } else {
      try {
        throw (await tarballRes.json()).error;
      } catch {}
      throw tarballRes.statusText || tarballRes.status;
    }
  } catch (e) {
    throw new JspmError(`Unable to fetch tarball for ${name}@${version} from ${rawUrl}: ${e}`);
  }

  const output = pako.inflate(tarball, { gzip: true });
  const extract = tar.extract();
  const fileData: Record<string, Uint8Array> = {};

  await new Promise((resolve, reject) => {
    extract.on('entry', async function (header, stream, next) {
      try {
        if (header.type === 'file') {
          if (header.name.indexOf('/') === -1) {
            next();
            return;
          }
          const name = header.name.slice(header.name.indexOf('/') + 1);
          const target = new Uint8Array(header.size!);
          let offset = 0;
          for await (const chunk of stream) {
            target.set(chunk, offset);
            offset += chunk.byteLength;
          }
          fileData[name] = target;
        }
        stream.once('end', next);
        stream.resume();
        next();
      } catch (e) {
        extract.emit('error', e);
      }
    });
    extract.once('error', reject);
    extract.once('finish', resolve);
    extract.end(output);
  });
  return fileData;
}

/**
 * Publishes a package to the jspm.io app registry
 *
 * Input package is already validated by JSPM
 *
 * @returns Promise that resolves with the package URL
 */
export async function publish(
  this: ProviderContext,
  pkg: ExactPackage,
  files: Record<string, string> | undefined,
  importMap: ImportMap | undefined,
  imports: string[],
  timeout = 30_000
): Promise<PublishOutput> {
  const { registry, name, version } = pkg;
  if (registry !== 'app') {
    throw new JspmError(
      `Invalid registry ${registry}, JSPM can only publish to the jspm.io "app:" registry currently`
    );
  }
  // Prepare the URL for the request
  const packageUrl = `${publishUrl}app:${name}@${version}`;

  // Prepare the package data using tar-stream
  const tarball = await createTarball(files, importMap);

  // Get or create token
  const token = await createPublishToken(name, version);

  // Upload the package
  const response = await globalThis.fetch(packageUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/gzip',
      Authorization: `Bearer ${token}`
      // for mutable packages, we retain the no-cache status for 30 seconds (for testing)
      // 'x-no-cache-duration': 30
    },
    body: tarball
  });

  if (!response.ok) {
    let errorMessage;
    switch (response.status) {
      case 413:
        errorMessage = `Publish failed - package size of ${tarball.byteLength}B is too large`;
        break;
      default:
        errorMessage = `Publish failed with status ${response.status}`;
    }
    try {
      const errorJson = await response.json();
      errorMessage =
        errorJson.message || errorJson.error || `Publish failed with status ${response.status}`;
    } catch {}
    throw new JspmError(errorMessage);
  }

  const result = await response.json();

  if (!result.success) {
    throw new JspmError(result.message || 'Publish failed');
  }

  const publicPackageUrl = pkgToUrl.call(this, pkg, 'default');
  const mapUrl = publicPackageUrl + 'importmap.json';

  return {
    packageUrl: publicPackageUrl,
    mapUrl,
    codeSnippet: `<!-- jspm.io import map injection (change to ".hot.js" for hot reloading) -->
<script src="${mapUrl.slice(0, -2)}" crossorigin="anoymous"></script>
<!-- Polyfill for older browsers -->
<script async src="${await latestEsms.call(this, rawUrl)}" crossorigin="anonymous"></script>
${
  imports.length
    ? `
<!-- Import entrypoint${imports.length > 1 ? 's' : ''} -->
<script type="module" crossorigin="anonymous">${imports.length > 1 ? '\n' : ''}${imports
        .map(
          (impt, idx) =>
            `${
              idx === 0
                ? ''
                : idx === 1
                ? '// Further available import map entrypoints - import as needed:\n// '
                : '// '
            }import '${impt}';`
        )
        .join('\n')}${imports.length > 1 ? '\n' : ''}</script>`
    : ''
}
`
  };
}

async function latestEsms(this: ProviderContext, forUrl: string) {
  // Obtain the latest ES Module Shims version
  const esmsPkg = await resolveLatestTarget.call(
    this,
    {
      name: 'es-module-shims',
      registry: 'npm',
      range: new SemverRange('*'),
      unstable: false
    },
    'default',
    forUrl,
    null
  );
  return pkgToUrl.call(this, esmsPkg, 'default') + 'dist/es-module-shims.js';
}

/**
 * Authenticate with JSPM API to obtain a token
 *
 * @param options Authentication options
 * @returns Promise resolving to an authentication token
 */
export async function auth(
  this: ProviderContext,
  options: {
    username?: string;
    verify: (url: string, instructions: string) => void;
  }
): Promise<{ token: string }> {
  // Start token request
  const deviceCodeResponse = await globalThis.fetch(`${apiUrl}v1/auth/cli`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: 'jspm-cli',
      scope: 'deployments'
    })
  });

  if (!deviceCodeResponse.ok) {
    throw new JspmError(
      `Failed to start authentication flow: ${deviceCodeResponse.status} ${deviceCodeResponse.statusText}`
    );
  }

  const deviceCodeData = await deviceCodeResponse.json();
  const {
    device_code: deviceCode,
    user_code: userCode,
    verification_uri_complete: verificationUri,
    interval = 5
  } = deviceCodeData;

  // Prepare instructions for the user
  const instructions = `Login or signup, using the code: ${userCode}`;

  // If a verification callback is provided, use it
  options.verify(verificationUri, instructions);

  while (true) {
    // Wait for the polling interval
    await new Promise(resolve => setTimeout(resolve, AUTH_POLL_INTERVAL));

    try {
      // Poll the token endpoint
      const tokenResponse = await globalThis.fetch(`${apiUrl}v1/auth/cli/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          device_code: deviceCode,
          client_id: 'jspm-cli'
        })
      });

      const tokenData = await tokenResponse.json();

      // Check for errors
      if (tokenResponse.status !== 200) {
        // If authorization is pending, continue polling
        if (tokenData.error === 'authorization_pending') {
          continue;
        }

        // If another error occurred, stop polling
        throw new JspmError(tokenData.error_description || 'Authentication failed');
      }

      // Success! Store and return the token
      authToken = tokenData.access_token;
      return { token: authToken };
    } catch (error) {
      // Handle network errors, continue polling
      if (error.name === 'FetchError') {
        continue;
      }

      throw error;
    }
  }
}

/**
 * Creates a JWT token for package publishing
 *
 * @param packageName Name of the package
 * @param packageVersion Version of the package
 * @returns JWT token for publish authorization
 */
async function createPublishToken(packageName: string, packageVersion: string): Promise<string> {
  if (!authToken) {
    throw new JspmError(
      `No auth token has been generated for jspm.io. Either set providers['jspm.io'].authToken, or first run "jspm auth jspm.io"`
    );
  }
  try {
    const response = await globalThis.fetch(`${apiUrl}v1/package/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        package_name: packageName,
        package_version: packageVersion
      })
    });

    if (!response.ok) {
      let errJson;
      try {
        errJson = await response.json();
      } catch {
        throw new Error(response.status.toString());
      }
      throw new Error(errJson.error ? errJson.error : JSON.stringify(errJson, null, 2));
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    // Fall back to the placeholder token if there's an error
    if (error.message.includes('Invalid or expired token'))
      throw new JspmError(
        `Invalid or expired token, run "jspm provider auth jspm.io" to regenerate an authentication token.`
      );
    throw new JspmError(error.message);
  }
}

/**
 * Creates a gzipped tarball from the provided files
 * Following npm conventions with a "package" folder at the root
 *
 * @param files Record of file paths to content
 * @param importMap Optional import map to include
 * @returns Promise that resolves with the tarball
 */
async function createTarball(
  files: Record<string, string | ArrayBuffer> | undefined,
  map: ImportMap | undefined
): Promise<Uint8Array> {
  const tar = await import('tar-stream');
  const { default: pako } = await import('pako');

  // Create pack stream
  const pack = tar.pack();
  // Collect chunks
  const deflator = new pako.Deflate({ gzip: true });

  const result: Promise<Uint8Array> = new Promise((resolve, reject) => {
    pack.on('data', (chunk: Buffer) => {
      deflator.push(chunk, false);
    });

    pack.on('finish', () => {
      console.log('wat');
    });

    pack.on('end', async () => {
      deflator.push(new Uint8Array([]), true);
      if (deflator.err) reject(deflator.err);
      else resolve(deflator.result);
    });

    pack.on('error', (err: Error) => {
      reject(err);
    });
  });

  if (map) {
    pack.entry(
      { name: 'package/importmap.json' },
      new TextEncoder().encode(JSON.stringify(map.toJSON()))
    );
  }

  // Add files to the tarball, placing them inside a "package" directory
  // to follow npm's convention
  if (files) {
    for (const [path, content] of Object.entries(files)) {
      let contentBuffer: Uint8Array;

      if (typeof content === 'string') {
        contentBuffer = new TextEncoder().encode(content);
      } else {
        contentBuffer = new Uint8Array(content);
      }

      // Prefix with "package/" to follow npm convention
      const tarPath = `package/${path}`;
      pack.entry({ name: tarPath }, contentBuffer);
    }
  }
  // Finalize the pack
  pack.finalize();
  return result;
}
