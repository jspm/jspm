import { Generator } from "@jspm/generator";
import assert from "assert";

// this private origin shouldn't really be shared publicly
const name = [111, 97, 107, 116, 105, 113]
  .map((x) => String.fromCharCode(x))
  .reverse()
  .join("");

// Test with custom CDN URL
{
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: "jspm.io",
    providerConfig: {
      "jspm.io": {
        cdnUrl: `https://${name}.com/`,
      },
    },
  });

  await generator.install("react@17.0.1");
  const json = generator.getMap();

  assert.strictEqual(
    json.imports.react,
    `https://${name}.com/npm:react@17.0.1/dev.index.js`
  );
}
