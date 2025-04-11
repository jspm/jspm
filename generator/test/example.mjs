import { Generator } from "@jspm/generator";

const generator = new Generator({
  mapUrl: import.meta.url,
  defaultProvider: "jspm.io",
  env: ["production", "browser"],
});

// Install a new package into the import map
await generator.install("react");

// Install a package version and subpath into the import map (installs lit/decorators.js)
await generator.install("lit@2/decorators.js");

// Install a package version to a custom alias
await generator.install({ alias: "react16", target: "react@16" });

// Install a specific subpath of a package
await generator.install({ target: "lit", subpath: "./html.js" });

console.log(JSON.stringify(generator.getMap(), null, 2));
