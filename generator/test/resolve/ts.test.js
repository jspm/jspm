import { Generator } from "@jspm/generator";
import { strictEqual } from "assert";

if (typeof document === "undefined") {
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: "nodemodules",
    typeScript: true,
  });

  await generator.link("./tspkg/main.ts");

  const map = generator.getMap();
  strictEqual(typeof map.imports["node:fs"], "string");

  strictEqual(
    generator.getAnalysis(new URL("./tspkg/dep.ts", import.meta.url)).format,
    "typescript"
  );
}
