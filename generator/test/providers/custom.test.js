import { Generator } from "@jspm/generator";
import assert from "assert";

const unpkgUrl = "https://unpkg.com/";
const exactPkgRegEx = /^((?:@[^/\\%@]+\/)?[^./\\%@][^/\\%@]*)@([^\/]+)(\/.*)?$/;

const generator = new Generator({
  defaultProvider: "custom",
  customProviders: {
    custom: {
      pkgToUrl({ registry, name, version }) {
        return `${unpkgUrl}${name}@${version}/`;
      },
      parseUrlPkg(url) {
        if (url.startsWith(unpkgUrl)) {
          const [, name, version] =
            url.slice(unpkgUrl.length).match(exactPkgRegEx) || [];
          return { registry: "npm", name, version };
        }
      },
      resolveLatestTarget(
        { registry, name, range, unstable },
        layer,
        parentUrl
      ) {
        return { registry, name, version: "3.6.0" };
      },
    },
  },
});

await generator.install("custom:jquery");

const json = generator.getMap();

assert.strictEqual(
  json.imports.jquery,
  "https://unpkg.com/jquery@3.6.0/dist/jquery.js"
);
