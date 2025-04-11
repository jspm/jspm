import { Generator } from "@jspm/generator";
import assert from "assert";
import { SemverRange } from "sver";

const generator = new Generator({
  mapUrl: new URL("./local/page.html", import.meta.url),
  env: ["production", "browser"],
  defaultProvider: "esm.sh",
});

const esmsPkg = await generator.traceMap.resolver.resolveLatestTarget(
  { name: "es-module-shims", registry: "npm", ranges: [new SemverRange("*")] },
  generator.traceMap.installer.defaultProvider
);
let pins, html;

html = `
<!doctype html>
<script type="module">
  import 'react';
</script>
`;
pins = await generator.addMappings(html);

assert(
  (await generator.htmlInject(html, { pins })).includes("https://esm.sh/*")
);
