import { Generator } from "@jspm/generator";
import assert from "assert";

{
  const generator = new Generator({
    inputMap: {
      imports: {
        react: "https://ga.jspm.io/npm:react@17.0.1/dev.index.js",
      },
      scopes: {
        "https://ga.jspm.io/": {
          "object-assign":
            "https://ga.jspm.io/npm:object-assign@4.1.0/index.js",
        },
      },
    },
    mapUrl: import.meta.url,
    defaultProvider: "jspm.io",
    env: ["production", "browser"],
  });

  await generator.reinstall();
  const json = generator.getMap();

  assert.strictEqual(
    json.imports.react,
    "https://ga.jspm.io/npm:react@17.0.1/index.js"
  );
  assert.strictEqual(
    json.scopes["https://ga.jspm.io/"]["object-assign"],
    "https://ga.jspm.io/npm:object-assign@4.1.0/index.js"
  );
}

{
  const generator = new Generator({
    env: ["production", "module", "browser"],
    ignore: ["custom"],
    inputMap: {
      imports: {
        custom: "/mapping.js",
        react: "https://ga.jspm.io/npm:react@17.0.1/dev.index.js",
      },
      scopes: {
        "https://ga.jspm.io/": {
          "object-assign":
            "https://ga.jspm.io/npm:object-assign@4.1.0/index.js",
        },
      },
    },
  });

  await generator.reinstall();

  const json = generator.getMap();

  assert.strictEqual(json.imports.custom, "/mapping.js");
  assert.strictEqual(
    json.imports.react,
    "https://ga.jspm.io/npm:react@17.0.1/index.js"
  );
  assert.strictEqual(
    json.scopes["https://ga.jspm.io/"]["object-assign"],
    "https://ga.jspm.io/npm:object-assign@4.1.0/index.js"
  );
}
