import { Generator } from '@jspm/generator';
import assert from 'assert';

// Test publishing a package with importMap enabled
// First we need to create a generator and install a package
// Then publish with importMap: true

// Create a generator instance with a test publish server
const generator = new Generator({
  mapUrl: new URL('./local/latest/', import.meta.url),
  providerConfig: {
    'jspm.io': {
      authToken: process.env.JSPM_AUTH_TOKEN
    }
  }
});

// Install a package to populate the import map
await generator.install({ alias: 'myapp', target: './' });

// Test package details for publish
const packageName = 'test-importmap-deploy';
const packageVersion = generateRandomSemver();

function generateRandomSemver() {
  const major = Math.floor(Math.random() * 20); // 0-19
  const minor = Math.floor(Math.random() * 100); // 0-99
  const patch = Math.floor(Math.random() * 100); // 0-99

  return `${major}.${minor}.${patch}`;
}

const packageFiles = {
  'package.json': JSON.stringify({
    name: packageName,
    version: packageVersion,
    type: 'module',
    main: 'index.js',
    dependencies: {
      react: '^17.0.0'
    }
  }),
  'index.js': `import React from 'react';
export default function App() {
  return React.createElement('div', null, 'Hello, world!');
}`
};

// Now publish with importMap: true
const publishResult = await generator.publish({
  package: packageFiles,
  importMap: true
});

// Verify publish URL is returned
assert.ok(publishResult.packageUrl, 'Publish should return a URL');
assert.ok(
  publishResult.packageUrl.includes(packageName),
  'Publish URL should include the package name'
);
assert.ok(
  publishResult.packageUrl.includes(packageVersion),
  'Publish URL should include the package version'
);

// Use the direct URL to the published package
const resolvedUrl = `${publishResult.packageUrl}/index.js`;

// Fetch the package to verify the content
try {
  const response = await fetch(resolvedUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch published package: ${response.status}`);
  }

  const content = await response.text();

  // Verify content matches what we published
  assert.ok(
    content.includes("import React from 'react'"),
    'Published content should match the original content'
  );

  // Fetch the published import map
  const importMapResponse = await fetch(publishResult.packageUrl + '/importmap.json');

  if (!importMapResponse.ok) {
    throw new Error(`Failed to fetch published import map: ${importMapResponse.status}`);
  }

  const outMap = await importMapResponse.json();
  assert.strictEqual(
    outMap.imports['test-importmap-deploy'],
    `https://jspm.io/app:test-importmap-deploy@${packageVersion}/index.js`
  );
  assert.ok(Object.keys(outMap.scopes).includes('https://jspm.io/'));
} catch (error) {
  console.error('Failed to verify published package:', error);
  throw error;
}
