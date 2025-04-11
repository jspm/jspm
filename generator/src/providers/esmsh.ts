import {
  ExactPackage,
  LatestPackageTarget,
  PackageConfig,
} from "../install/package.js";
import { Resolver } from "../trace/resolver.js";
// @ts-ignore
import { fetch } from "../common/fetch.js";
import { JspmError } from "../common/err.js";
import { fetchVersions } from "./jspm.js";
// @ts-ignore
import { SemverRange } from "sver";
import { importedFrom } from "../common/url.js";

const cdnUrl = "https://esm.sh/";

export async function pkgToUrl(pkg: ExactPackage): Promise<`${string}/`> {
  // The wildcard '*' at the end tells the esm.sh CDN to externalise all
  // dependencies instead of bundling them into the returned module file.
  //   see https://esm.sh/#docs
  return `${cdnUrl}*${pkg.name}@${pkg.version}/`;
}

const exactPkgRegEx =
  /^(?:v\d+\/)?\*?((?:@[^/\\%@]+\/)?[^./\\%@][^/\\%@]*)@([^\/]+)(\/.*)?$/;

export function parseUrlPkg(url: string) {
  if (!url.startsWith(cdnUrl)) return;
  const [, name, version] = url.slice(cdnUrl.length).match(exactPkgRegEx) || [];
  if (!name || !version) return;
  return { registry: "npm", name, version };
}

export async function getPackageConfig(
  this: Resolver,
  pkgUrl: string
): Promise<PackageConfig | null> {
  const res = await fetch(`${pkgUrl}package.json`, this.fetchOpts);
  switch (res.status) {
    case 200:
    case 304:
      break;
    case 400:
    case 401:
    case 403:
    case 404:
    case 406:
    case 500:
      this.pcfgs[pkgUrl] = null;
      return;
    default:
      throw new JspmError(
        `Invalid status code ${res.status} reading package config for ${pkgUrl}. ${res.statusText}`
      );
  }

  return await res.json();
}

export async function resolveLatestTarget(
  this: Resolver,
  target: LatestPackageTarget,
  layer: string,
  parentUrl: string
): Promise<ExactPackage | null> {
  const { registry, name, range, unstable } = target;
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
