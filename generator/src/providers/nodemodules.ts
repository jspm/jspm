import { LatestPackageTarget } from "../install/package.js";
import { ExactPackage } from "../install/package.js";
import { Resolver } from "../trace/resolver.js";
import { Provider } from "./index.js";
// @ts-ignore
import { fetch } from "../common/fetch.js";
import { JspmError } from "../common/err.js";
import { importedFrom } from "../common/url.js";
import { PackageConfig } from "../install/package.js";
import { encodeBase64, decodeBase64 } from "../common/b64.js";

export function createProvider(
  baseUrl: string,
  ownsBaseUrl: boolean
): Provider {
  return {
    ownsUrl,
    pkgToUrl,
    parseUrlPkg,
    resolveLatestTarget,
    getPackageConfig,
  };

  function ownsUrl(this: Resolver, url: string) {
    // The nodemodules provider owns the base URL when it is the default
    // provider so that it can link against a user's local installs, letting
    // us support "file:" dependencies:
    return (ownsBaseUrl && url === baseUrl) || url.includes("/node_modules/");
  }

  async function pkgToUrl(
    this: Resolver,
    pkg: ExactPackage
  ): Promise<`${string}/`> {
    // The node_modules registry uses the base64-encoded URL of the package as
    // the package version, so we need to decode it to get the right copy. See
    // comments in the `resolveLatestTarget` function for details:
    if (pkg.registry === "node_modules") {
      return `${decodeBase64(pkg.version)}` as `${string}/`;
    }

    // If we don't have a URL in the package name, then we need to try and
    // resolve the package against the node_modules in the base package:
    const target = await nodeResolve.call(this, pkg.name, baseUrl);
    if (!target)
      throw new JspmError(
        `Failed to resolve ${pkg.name} against node_modules from ${baseUrl}`
      );

    return `${decodeBase64(target.version)}` as `${string}/`;
  }

  function parseUrlPkg(this: Resolver, url: string) {
    // We can only resolve packages in node_modules folders:
    const nodeModulesIndex = url.lastIndexOf("/node_modules/");
    if (nodeModulesIndex === -1) return null;

    const nameAndSubpaths = url.slice(nodeModulesIndex + 14).split("/");
    const name =
      nameAndSubpaths[0][0] === "@"
        ? `${nameAndSubpaths[0]}/${nameAndSubpaths[1]}`
        : nameAndSubpaths[0];
    const pkgUrl = `${url.slice(0, nodeModulesIndex + 14)}${name}/`;
    const subpath = `./${url.slice(pkgUrl.length)}`;

    if (name && pkgUrl) {
      return {
        pkg: {
          name,
          registry: "node_modules",
          version: encodeBase64(pkgUrl),
        },
        subpath: subpath === "./" ? null : (subpath as `./${string}`),
        layer: "default",
      };
    }
  }

  async function resolveLatestTarget(
    this: Resolver,
    target: LatestPackageTarget,
    _layer: string,
    parentUrl: string
  ): Promise<ExactPackage | null> {
    return nodeResolve.call(this, target.name, parentUrl);
  }

  async function getPackageConfig(
    this: Resolver,
    pkgUrl: string
  ): Promise<PackageConfig | null> {
    if (!ownsUrl.call(this, pkgUrl)) return null;

    const pkgJsonUrl = new URL("package.json", pkgUrl);
    const res = await fetch(pkgJsonUrl.href, this.fetchOpts);
    switch (res.status) {
      case 200:
      case 304:
        break;
      default:
        return null;
    }

    async function remap(this: Resolver, deps: Record<string, string> | null) {
      if (!deps) return;
      for (const [name, dep] of Object.entries(deps)) {
        if (!isLocal(dep)) continue;

        const remappedUrl = new URL(`./node_modules/${name}`, pkgUrl);
        if (!(await dirExists.call(this, remappedUrl))) continue;

        deps[name] = remappedUrl.href;
      }
    }

    const pcfg = (await res.json()) as PackageConfig;
    await remap.call(this, pcfg.dependencies);
    await remap.call(this, pcfg.peerDependencies);
    await remap.call(this, pcfg.optionalDependencies);
    await remap.call(this, pcfg.devDependencies);
    return pcfg;
  }
}

/**
 * Mimics the node resolution algorithm: look for a node_modules in the
 * current directory with a package matching the target, and if you can't
 * find it then recurse through the parent directories until you do.
 * TODO: we don't currently handle the target's version constraints here
 */
let realpath, pathToFileURL;
async function nodeResolve(
  this: Resolver,
  name: string,
  parentUrl: string
): Promise<ExactPackage | null> {
  let curUrl = new URL(`node_modules/${name}`, parentUrl);
  const rootUrl = new URL(`/node_modules/${name}`, parentUrl).href;
  const isScoped = name[0] === "@";

  while (!(await dirExists.call(this, curUrl))) {
    if (curUrl.href === rootUrl) return null; // failed to resolve

    curUrl = new URL(
      `../../${isScoped ? "../" : ""}node_modules/${name}`,
      curUrl
    );
  }

  // Providers need to be able to translate between canonical package specs and
  // URLs in a one-to-one fashion. The nodemodules provider breaks this contract
  // as a node_modules folder may contain multiple copies of a given package
  // and version, and if the user has local packages installed then "identical"
  // packages may have different contents! To work around this use the
  // base64-encoded URL of the package as the package version in the local
  // registry, which we can decode to get the right copy:
  return {
    name,
    registry: "node_modules",
    version: encodeBase64(`${curUrl.href}/`),
  };
}

async function dirExists(this: Resolver, url: URL, parentUrl?: string) {
  const res = await fetch(url, this.fetchOpts);
  switch (res.status) {
    case 304:
    case 200:
      return true;
    case 404:
      return false;
    default:
      throw new JspmError(
        `Invalid status code ${res.status} looking up "${url}" - ${
          res.statusText
        }${importedFrom(parentUrl)}`
      );
  }
}

function isLocal(dep: string): boolean {
  return dep.startsWith("file:");
}
