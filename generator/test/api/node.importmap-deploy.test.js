import { Generator } from "@jspm/generator";
import assert from "assert";

// Test deploying a package with importMap enabled
// First we need to create a generator and install a package
// Then deploy with importMap: true

// Create a generator instance with a test deployment server
const generator = new Generator({
  mapUrl: new URL("./local/latest/", import.meta.url),
  providerConfig: {
    "jspm.io": {
      authToken: process.env.JSPM_AUTH_TOKEN,
    },
  },
});

// Install a package to populate the import map
await generator.install({ alias: "myapp", target: "./" });

// Test package details for deployment
const packageName = "test-importmap-deploy";
const packageVersion = generateRandomSemver();

function generateRandomSemver() {
  const major = Math.floor(Math.random() * 20); // 0-19
  const minor = Math.floor(Math.random() * 100); // 0-99
  const patch = Math.floor(Math.random() * 100); // 0-99

  return `${major}.${minor}.${patch}`;
}

const packageFiles = {
  "package.json": JSON.stringify({
    name: packageName,
    version: packageVersion,
    type: "module",
    main: "index.js",
    dependencies: {
      react: "^17.0.0",
    },
  }),
  "index.js": `import React from 'react';
export default function App() {
  return React.createElement('div', null, 'Hello, world!');
}`,
};

// Now deploy with importMap: true
const deployResult = await generator.deploy({
  package: packageFiles,
  importMap: true,
});

// Verify deployment URL is returned
assert.ok(deployResult.packageUrl, "Deployment should return a URL");
assert.ok(
  deployResult.packageUrl.includes(packageName),
  "Deployment URL should include the package name"
);
assert.ok(
  deployResult.packageUrl.includes(packageVersion),
  "Deployment URL should include the package version"
);

// Use the direct URL to the deployed package
const resolvedUrl = `${deployResult.packageUrl}/index.js`;

// Fetch the package to verify the content
try {
  const response = await fetch(resolvedUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch deployed package: ${response.status}`);
  }

  const content = await response.text();

  // Verify content matches what we deployed
  assert.ok(
    content.includes("import React from 'react'"),
    "Deployed content should match the original content"
  );

  // Fetch the deployed import map
  const importMapResponse = await fetch(
    deployResult.packageUrl + "/importmap.json"
  );

  if (!importMapResponse.ok) {
    throw new Error(
      `Failed to fetch deployed import map: ${importMapResponse.status}`
    );
  }

  const outMap = await importMapResponse.json();
  assert.strictEqual(
    outMap.imports["test-importmap-deploy"],
    `https://jspm.io/app:test-importmap-deploy@${packageVersion}/index.js`
  );
  assert.ok(Object.keys(outMap.scopes).includes("https://jspm.io/"));
} catch (error) {
  console.error("Failed to verify deployed package:", error);
  throw error;
}
