import { Generator, lookup, fetch } from "@jspm/generator";
import assert from "assert";

const myorgUrl = "https://unpkg.com/";
const exactPkgRegEx = /^((?:@[^/\\%@]+\/)?[^./\\%@][^/\\%@]*)@([^\/]+)(\/.*)?$/;

const generator = new Generator({
  defaultProvider: "myorg",
  customProviders: {
    myorg: {
      ownsUrl(url) {
        return url.startsWith(myorgUrl);
      },
      pkgToUrl({ registry, name, version }) {
        return `${myorgUrl}${name}@${version}/`;
      },
      async getPackageConfig(pkgUrl) {
        // hook package.json lookup to insert explicit registry identifiers in package.json dependencies
        // the alternative to this approach is to set a global "defaultRegistry" generator option
        // but that option is limited in that the defaultRegistry is global instead of being per-provider /
        // per-service.
        // This is thus the recommended way to support multi-registry workflows, keeping npm as the default
        // (per ecosystem semantics), and instead overriding package.json dependency schemas to point to
        // any new registries.
        const pcfg = await (await fetch(`${pkgUrl}package.json`)).json();
        // strictly, this should also be for optionalDependencies + peerDependencies
        if (pcfg.dependencies) {
          let dependencies = {};
          for (let [name, target] of Object.entries(pcfg.dependencies)) {
            if (target.indexOf(":") === -1)
              target = "myorg:" + name + "@" + target;
            dependencies[name] = target;
          }
          pcfg.dependencies = dependencies;
        }
        return pcfg;
      },
      parseUrlPkg(url) {
        if (url.startsWith(myorgUrl)) {
          const [, name, version] =
            url.slice(myorgUrl.length).match(exactPkgRegEx) || [];
          return { registry: "myorg", name, version };
        }
      },
      async resolveLatestTarget(
        { registry, name, range, unstable },
        layer,
        parentUrl
      ) {
        assert.ok(registry === "myorg");
        const {
          resolved: { name: resolvedName, version: resolvedVersion },
        } = await lookup(`${name}@${range.toString()}`);
        return {
          registry: "myorg",
          name: resolvedName,
          version: resolvedVersion,
        };
      },
    },
  },
});

await generator.install("myorg:lit");

const json = generator.getMap();

assert.ok(json.imports.lit.startsWith("https://unpkg.com/lit@"));
