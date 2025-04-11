import {
  ExactPackage,
  LatestPackageTarget,
  PackageConfig,
} from "../install/package.js";
import { Resolver } from "../trace/resolver.js";
import { SemverRange } from "sver";
// @ts-ignore
import { fetch } from "../common/fetch.js";
import { Install } from "../generator.js";

const cdnUrl = "https://deno.land/x/";
const stdlibUrl = "https://deno.land/std";

let denoStdVersion;

export function resolveBuiltin(
  specifier: string,
  env: string[]
): string | Install | undefined {
  // Bare npm:XXX imports are supported by Deno:
  if (env.includes("deno") && specifier.startsWith("npm:")) return specifier;

  if (specifier.startsWith("deno:")) {
    let name = specifier.slice(5);
    if (name.endsWith(".ts")) name = name.slice(0, -3);
    let alias = name,
      subpath: "." | `./${string}` = ".";
    const slashIndex = name.indexOf("/");
    if (slashIndex !== -1) {
      alias = name.slice(0, slashIndex);
      subpath = `./${name.slice(slashIndex + 1)}`;
    }
    return {
      alias,
      subpath,
      target: {
        pkgTarget: {
          registry: "deno",
          name: "std",
          ranges: [new SemverRange("*")],
          unstable: true,
        },
        installSubpath: `./${
          slashIndex === -1 ? name : name.slice(0, slashIndex)
        }`,
      },
    };
  }
}

export async function pkgToUrl(pkg: ExactPackage): Promise<`${string}/`> {
  if (pkg.registry === "deno") return `${stdlibUrl}@${pkg.version}/`;
  if (pkg.registry === "denoland")
    return `${cdnUrl}${pkg.name}@${vCache[pkg.name] ? "v" : ""}${pkg.version}/`;
  throw new Error(
    `Deno provider does not support the ${pkg.registry} registry for package "${pkg.name}" - perhaps you mean to install "denoland:${pkg.name}"?`
  );
}

export async function getPackageConfig(
  this: Resolver,
  pkgUrl: string
): Promise<PackageConfig | null | undefined> {
  if (pkgUrl.startsWith("https://deno.land/std@")) {
    return {
      exports: {
        "./archive": "./archive/mod.ts",
        "./archive/*.ts": "./archive/*.ts",
        "./archive/*": "./archive/*.ts",
        "./async": "./async/mod.ts",
        "./async/*.ts": "./async/*.ts",
        "./async/*": "./async/*.ts",
        "./bytes": "./bytes/mod.ts",
        "./bytes/*.ts": "./bytes/*.ts",
        "./bytes/*": "./bytes/*.ts",
        "./collection": "./collection/mod.ts",
        "./collection/*.ts": "./collection/*.ts",
        "./collection/*": "./collection/*.ts",
        "./crypto": "./crypto/mod.ts",
        "./crypto/*.ts": "./crypto/*.ts",
        "./crypto/*": "./crypto/*.ts",
        "./datetime": "./datetime/mod.ts",
        "./datetime/*.ts": "./datetime/*.ts",
        "./datetime/*": "./datetime/*.ts",
        "./dotenv": "./dotenv/mod.ts",
        "./dotenv/*.ts": "./dotenv/*.ts",
        "./dotenv/*": "./dotenv/*.ts",
        "./encoding": "./encoding/mod.ts",
        "./encoding/*.ts": "./encoding/*.ts",
        "./encoding/*": "./encoding/*.ts",
        "./examples": "./examples/mod.ts",
        "./examples/*.ts": "./examples/*.ts",
        "./examples/*": "./examples/*.ts",
        "./flags": "./flags/mod.ts",
        "./flags/*.ts": "./flags/*.ts",
        "./flags/*": "./flags/*.ts",
        "./fmt": "./fmt/mod.ts",
        "./fmt/*.ts": "./fmt/*.ts",
        "./fmt/*": "./fmt/*.ts",
        "./fs": "./fs/mod.ts",
        "./fs/*.ts": "./fs/*.ts",
        "./fs/*": "./fs/*.ts",
        "./hash": "./hash/mod.ts",
        "./hash/*.ts": "./hash/*.ts",
        "./hash/*": "./hash/*.ts",
        "./http": "./http/mod.ts",
        "./http/*.ts": "./http/*.ts",
        "./http/*": "./http/*.ts",
        "./io": "./io/mod.ts",
        "./io/*.ts": "./io/*.ts",
        "./io/*": "./io/*.ts",
        "./log": "./log/mod.ts",
        "./log/*.ts": "./log/*.ts",
        "./log/*": "./log/*.ts",
        "./media_types": "./media_types/mod.ts",
        "./media_types/*.ts": "./media_types/*.ts",
        "./media_types/*": "./media_types/*.ts",
        "./node": "./node/mod.ts",
        "./node/*.ts": "./node/*.ts",
        "./node/*": "./node/*.ts",
        "./path": "./path/mod.ts",
        "./path/*.ts": "./path/*.ts",
        "./path/*": "./path/*.ts",
        "./permissions": "./permissions/mod.ts",
        "./permissions/*.ts": "./permissions/*.ts",
        "./permissions/*": "./permissions/*.ts",
        "./signal": "./signal/mod.ts",
        "./signal/*.ts": "./signal/*.ts",
        "./signal/*": "./signal/*.ts",
        "./streams": "./streams/mod.ts",
        "./streams/*.ts": "./streams/*.ts",
        "./streams/*": "./streams/*.ts",
        "./testing": "./testing/mod.ts",
        "./testing/*.ts": "./testing/*.ts",
        "./testing/*": "./testing/*.ts",
        "./textproto": "./textproto/mod.ts",
        "./textproto/*.ts": "./textproto/*.ts",
        "./textproto/*": "./textproto/*.ts",
        "./uuid": "./uuid/mod.ts",
        "./uuid/*.ts": "./uuid/*.ts",
        "./uuid/*": "./uuid/*.ts",
        "./version": "./version.ts",
        "./version.ts": "./version.ts",
        "./wasi": "./wasi/mod.ts",
        "./wasi/*.ts": "./wasi/*.ts",
        "./wasi/*": "./wasi*.ts",
      },
    };
  }

  // If there's a package.json, return that:
  const pkgJsonUrl = new URL("package.json", pkgUrl);
  const pkgRes = await fetch(pkgJsonUrl.href, this.fetchOpts);
  switch (pkgRes.status) {
    case 200:
    case 304:
      return (await pkgRes.json()) as PackageConfig;
  }

  return null;
}

const vCache = {};

export function parseUrlPkg(
  url: string
):
  | { pkg: ExactPackage; subpath: `./${string}` | null; layer: string }
  | undefined {
  let subpath = null;
  if (url.startsWith(stdlibUrl) && url[stdlibUrl.length] === "@") {
    const version = url.slice(
      stdlibUrl.length + 1,
      url.indexOf("/", stdlibUrl.length + 1)
    );
    subpath = url.slice(stdlibUrl.length + version.length + 2);
    if (subpath.endsWith("/mod.ts")) subpath = subpath.slice(0, -7);
    else if (subpath.endsWith(".ts")) subpath = subpath.slice(0, -3);
    const name =
      subpath.indexOf("/") === -1
        ? subpath
        : subpath.slice(0, subpath.indexOf("/"));
    return {
      pkg: { registry: "deno", name: "std", version },
      layer: "default",
      subpath: `./${name}${
        subpath ? (`./${subpath}/mod.ts` as `./${string}`) : ""
      }`,
    };
  } else if (url.startsWith(cdnUrl)) {
    const path = url.slice(cdnUrl.length);
    const versionIndex = path.indexOf("@");
    if (versionIndex === -1) return;
    const sepIndex = path.indexOf("/", versionIndex);
    const name = path.slice(0, versionIndex);
    const version = path.slice(
      versionIndex + ((vCache[name] = path[versionIndex + 1] === "v") ? 2 : 1),
      sepIndex === -1 ? path.length : sepIndex
    );
    return {
      pkg: { registry: "denoland", name, version },
      subpath: null,
      layer: "default",
    };
  }
}

export async function resolveLatestTarget(
  this: Resolver,
  target: LatestPackageTarget,
  _layer: string,
  parentUrl: string
): Promise<ExactPackage | null> {
  let { registry, name, range } = target;

  if (denoStdVersion && registry === "deno")
    return { registry, name, version: denoStdVersion };

  if (range.isExact)
    return { registry, name, version: range.version.toString() };

  // convert all Denoland ranges into wildcards
  // since we don't have an actual semver lookup at the moment
  if (!range.isWildcard) range = new SemverRange(range.version.toString());

  const fetchOpts = {
    ...this.fetchOpts,
    headers: Object.assign({}, this.fetchOpts.headers || {}, {
      // For some reason, Deno provides different redirect behaviour for the server
      // Which requires us to use the text/html accept
      accept: typeof document === "undefined" ? "text/html" : "text/javascript",
    }),
  };
  // "mod.ts" addition is necessary for the browser otherwise not resolving an exact module gives a CORS error
  const fetchUrl =
    registry === "denoland"
      ? cdnUrl + name + "/mod.ts"
      : stdlibUrl + "/version.ts";
  const res = await fetch(fetchUrl, fetchOpts);
  if (!res.ok) throw new Error(`Deno: Unable to lookup ${fetchUrl}`);
  const { version } = (await parseUrlPkg(res.url)).pkg;
  if (registry === "deno") denoStdVersion = version;
  return { registry, name, version };
}
