import { Generator } from "@jspm/generator";
import assert from "assert";

// TODO: enable these one we support arbitrary URL installation

// Should be able to install a package scope URL directly, and it should
// resolve to the default export in the scope's package.json:
await (async (enabled = true) => {
  if (!enabled) return;

  const gen = new Generator();
  await gen.install("https://unpkg.com/lit@2.0.0/");
  const map = gen.getMap();

  assert.ok(map);
  assert.strictEqual(map?.imports?.lit, "https://unpkg.com/lit@2.0.0/index.js");
})(false);

// Should be able to install a particular exports subpath from a package scope
// URL directly using the pipe ("|") separator
await (async (enabled = true) => {
  if (!enabled) return;

  const gen = new Generator();
  await gen.install("https://unpkg.com/react@18.0.0|jsx-runtime");
  const map = gen.getMap();

  assert.ok(map);
  assert.strictEqual(
    map?.imports["react/jsx-runtime"],
    "https://unpkg.com/react@18.0.0/jsx-runtime.js"
  );
})(false);

// Should be able to install a module URL directly, if that module URL is
// present as an export in the scope's package.json:
await (async (enabled = true) => {
  if (!enabled) return;

  const gen = new Generator();
  await gen.install("https://unpkg.com/lit@2.0.0/index.js");
  const map = gen.getMap();

  assert.ok(map);
  assert.strictEqual(map?.imports?.lit, "https://unpkg.com/lit@2.0.0/index.js");
})(false);

// TODO
// Should be able to install a module URL directly, even if that module URL is
// _not_ present as an export in the scope's package.json. This is a case of
// "let people who know what they're doing actually do it":
