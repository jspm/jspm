import { Generator } from "@jspm/generator";
import assert from "assert";

// Mimic calling the generator from the ./local/pkg package:
const mapUrl = new URL("./local/pkg/importmap.json", import.meta.url).href;
const pkgNames = ["localpkg", "localpkg/custom", "localpkg/conditional"];

for (const pkgName of pkgNames) {
  let generator = new Generator({
    mapUrl,
    env: ["production"],
  });

  // Installing the package from within itself should resolve locally, since the
  // package.json has a local export for ".":
  await generator.link(pkgName);
  let json = generator.getMap();
  assert.ok(json.imports[pkgName]);

  // Uninstalling using the same generator instance should remove the install
  // entirely and return an empty map:
  await generator.uninstall(pkgName);
  assert.ok(!generator.getMap().imports);

  // Uninstalling using a new generator instance should _also_ remove the install
  // from the import map, i.e. the generator should be able to reconstruct the
  // context given just an input map:
  generator = new Generator({
    mapUrl,
    inputMap: json,
    env: ["production"],
  });

  // Uninstalling the package should get rid of it:
  await generator.uninstall(pkgName);
  json = generator.getMap();
  assert.ok(!json.imports);
}
