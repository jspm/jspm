import { Generator } from "@jspm/generator";
import assert from "assert";
import { fileURLToPath } from "url";

const generator = new Generator({
  mapUrl: import.meta.url,
  defaultProvider: "nodemodules",
});

const htmlUrl = new URL("./preload-local/index.html", import.meta.url);
const html = `
<!doctype html>
<html>

<head>
  <title>preload-local.test.js</title>
</head>

<body>
  <script type="module">
    import "chalk";
  </script>
</body>

</html>
`;

const pins = await generator.addMappings(html);
const result = await generator.htmlInject(html, {
  pins,
  htmlUrl,
  preload: true,
  esModuleShims: false,
});

const root = new URL("../..", import.meta.url);
const re = /"modulepreload" *href="(.*)"/g;
const preloads = result.matchAll(re);
for (const preload of preloads) {
  // Make sure that all of the preloads are rebased:
  assert.ok(!preload[1].toString().startsWith(root.href));
}
