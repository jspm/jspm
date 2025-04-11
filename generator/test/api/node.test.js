import { Generator, lookup } from "@jspm/generator";
import assert from "assert";

{
  const generator = new Generator();

  await generator.link("fs/promises");

  const json = generator.getMap();

  assert.strictEqual(
    json.imports["fs/promises"].split("/").slice(-4).join("/"),
    `nodelibs/browser/fs/promises.js`
  );
}

{
  const generator = new Generator({
    env: ["production", "browser"],
  });

  await generator.install("node:process");

  const json = generator.getMap();

  assert.strictEqual(
    json.imports["process"],
    `https://ga.jspm.io/npm:@jspm/core@${
      (await lookup("@jspm/core")).resolved.version
    }/nodelibs/browser/process-production.js`
  );
}

{
  const generator = new Generator({
    env: ["production", "browser"],
    inputMap: {
      imports: {
        fs: "https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.20/nodelibs/node/fs.js",
      },
    },
  });

  await generator.install("node:process");

  const json = generator.getMap();

  assert.strictEqual(
    json.imports["fs"],
    `https://ga.jspm.io/npm:@jspm/core@${
      (await lookup("@jspm/core")).resolved.version
    }/nodelibs/browser/fs.js`
  );
  assert.strictEqual(
    json.imports["process"],
    `https://ga.jspm.io/npm:@jspm/core@${
      (await lookup("@jspm/core")).resolved.version
    }/nodelibs/browser/process-production.js`
  );
}

{
  const generator = new Generator({
    env: ["production", "browser"],
    inputMap: {
      imports: {
        fs: "https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.20/nodelibs/node/fs.js",
      },
    },
  });

  await generator.link("node:process");

  const json = generator.getMap();

  assert.strictEqual(
    json.imports["node:process"],
    `https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.20/nodelibs/browser/process-production.js`
  );
}

{
  const generator = new Generator({
    env: ["production", "browser"],
    inputMap: {
      imports: {
        fs: `https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.20/nodelibs/node/fs.js`,
      },
    },
  });

  await generator.install("node:process");

  const json = generator.getMap();

  assert.strictEqual(
    json.imports["process"],
    `https://ga.jspm.io/npm:@jspm/core@${
      (await lookup("@jspm/core")).resolved.version
    }/nodelibs/browser/process-production.js`
  );
}
