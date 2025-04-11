import { fetch } from "../../lib/common/fetch.js";
import { Generator } from "@jspm/generator";
import assert from "assert";

const expectedResults = {
  "primary-in-range": {
    wayfarer: "https://ga.jspm.io/npm:wayfarer@6.6.4/index.js",
    xtend: "https://ga.jspm.io/npm:xtend@4.0.2/immutable.js",
  },
  "primary-out-range": {
    wayfarer: "https://ga.jspm.io/npm:wayfarer@6.6.4/index.js",
    xtend: "https://ga.jspm.io/npm:xtend@4.0.2/immutable.js",
  },
  "secondary-in-range": {
    wayfarer: "https://ga.jspm.io/npm:wayfarer@6.6.2/index.js",
    xtend: "https://ga.jspm.io/npm:xtend@4.0.1/immutable.js",
  },
  "secondary-out-range": {
    wayfarer: "https://ga.jspm.io/npm:wayfarer@6.6.2/index.js",
    xtend: "https://ga.jspm.io/npm:xtend@4.0.2/immutable.js",
  },
  "primary-not-latest-secondary-in-range": {
    wayfarer: "https://ga.jspm.io/npm:wayfarer@6.6.4/index.js",
    xtend: "https://ga.jspm.io/npm:xtend@4.0.1/immutable.js",
  },
  "primary-not-latest-secondary-out-range": {
    wayfarer: "https://ga.jspm.io/npm:wayfarer@6.6.4/index.js",
    xtend: "https://ga.jspm.io/npm:xtend@4.0.2/immutable.js",
  },
};

for (const [name, expected] of Object.entries(expectedResults)) {
  const res = await fetch(
    new URL(`./${name}/importmap.json`, import.meta.url),
    {
      cache: "no-store", // don't want cached stuff in tests
    }
  );
  assert(
    res.status === 200 || res.status === 304,
    `Failed to fetch import map for ${name}: ${res.statusText}`
  );
  const inputMap = await res.json();
  const gen = new Generator({
    baseUrl: new URL(`./${name}/`, import.meta.url),
    inputMap,
  });

  await gen.update("wayfarer");
  const map = JSON.stringify(gen.getMap(), null, 2);
  for (const [pkg, resolution] of Object.entries(expected)) {
    assert(
      map.includes(resolution),
      `${name}: ${pkg} should have resolution ${resolution}:\n${map}`
    );
  }
}
