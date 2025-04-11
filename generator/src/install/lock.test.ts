import { ExactModule } from "@jspm/generator/install/package.js";
import { translateProvider } from "@jspm/generator/install/lock.js";
import { Generator } from "@jspm/generator";
import { encodeBase64 } from "@jspm/generator/common/b64.js";
import { strictEqual } from "assert";

const rootUrl = new URL("../../", import.meta.url);
const g = new Generator({
  mapUrl: rootUrl.href,
});
const r = g.traceMap.resolver;

{
  /* changeProvider tests */
  async function testForRegistry(
    registry: string,
    n: string,
    v: string,
    isNull: boolean = false
  ) {
    const mdl: ExactModule = {
      pkg: {
        name: n,
        version: v,
        registry,
      },
      subpath: null,
      source: { provider: "test", layer: "default" },
    };

    // Should have switched to "npm" registry, as that's what jspm.io tracks:
    const provider = { provider: "jspm.io", layer: "default" };
    const res = await translateProvider(mdl, provider, r, rootUrl);
    if (isNull) {
      strictEqual(res, null);
    } else {
      strictEqual(res.pkg.name, "chalk");
      strictEqual(res.pkg.registry, "npm");
      strictEqual(res.pkg.version, "4.1.2");
    }
  }

  // Must match the version of "chalk" installed locally!
  await testForRegistry("npm", "chalk", "4.1.2");
  await testForRegistry(
    "node_modules",
    "chalk",
    encodeBase64(new URL("./node_modules/chalk/", rootUrl).href)
  );
}
