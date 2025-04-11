import { JspmError } from "../common/err.js";
import { importedFrom } from "../common/url.js";
import { ExactPackage, LatestPackageTarget } from "../install/package.js";
import { Resolver } from "../trace/resolver.js";
import { fetchVersions } from "./jspm.js";
// @ts-ignore
import { SemverRange } from "sver";

const cdnUrl = "https://cdn.jsdelivr.net/";

export async function pkgToUrl(pkg: ExactPackage): Promise<`${string}/`> {
  return `${cdnUrl}${pkg.registry}/${pkg.name}@${pkg.version}/`;
}

const exactPkgRegEx =
  /^([^\/]+)\/((?:@[^/\\%@]+\/)?[^./\\%@][^/\\%@]*)@([^\/]+)(\/.*)?$/;

export function parseUrlPkg(url: string) {
  if (!url.startsWith(cdnUrl)) return;
  const [, registry, name, version] =
    url.slice(cdnUrl.length).match(exactPkgRegEx) || [];
  return { registry, name, version };
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
