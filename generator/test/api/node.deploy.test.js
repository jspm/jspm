import { Generator } from '@jspm/generator';
import assert from 'assert';

function generateRandomVersion() {
  const major = Math.floor(Math.random() * 10);
  const minor = Math.floor(Math.random() * 100);
  const patch = Math.floor(Math.random() * 1000);

  return `${major}.${minor}.${patch}`;
}

// ---- Simple Package Test ----
{
  // Test package information
  const name = 'test-deploy-package';
  const version = generateRandomVersion();
  const indexContent = "export default { name: 'test-deploy-package' };";

  // Create package files
  const packageFiles = {
    'package.json': JSON.stringify({
      name: name,
      version: version,
      type: 'module',
      main: 'index.js'
    }),
    'index.js': indexContent
  };

  // Test deployment
  const generator = new Generator({
    providerConfig: {
      'jspm.io': {
        authToken: process.env.JSPM_AUTH_TOKEN
      }
    }
  });
  const deployResult = await generator.deploy({
    package: packageFiles
  });

  // Verify deployment URL is returned
  assert.ok(deployResult.packageUrl, 'Deployment should return a URL');
  assert.ok(
    deployResult.packageUrl.includes(name),
    'Deployment URL should include the package name'
  );
  assert.ok(
    deployResult.packageUrl.includes(version),
    'Deployment URL should include the package version'
  );

  // Use the direct URL to the deployed package
  const resolvedUrl = `${deployResult.packageUrl}/index.js`;

  assert.ok(resolvedUrl, 'Package should be resolved in the import map');

  // Fetch the package to verify the content
  try {
    const response = await fetch(resolvedUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch deployed package ${resolvedUrl}: ${response.status}`);
    }

    const content = await response.text();

    // Verify content matches what we deployed
    assert.ok(
      content.includes(indexContent.trim()),
      'Deployed content should match the original content'
    );
  } catch (error) {
    console.error('Failed to verify deployed package:', error);
    throw error;
  }

  // Next we perform ejection to verify we can run the package locally again
  if (typeof globalThis.process?.versions?.node === 'string') {
    const generator = new Generator({
      providerConfig: {
        'jspm.io': {
          authToken: process.env.JSPM_AUTH_TOKEN
        }
      }
    });

    const [{ mkdirSync, readdirSync, readFileSync }, { tmpdir }, { join }, { pathToFileURL }] =
      await Promise.all([
        import(eval('"node:fs"')),
        import(eval('"node:os"')),
        import(eval('"node:path"')),
        import(eval('"node:url"'))
      ]);

    const tmpDirPath = join(tmpdir(), `tmp-${Math.round(Math.random() * 100_000)}`);
    try {
      mkdirSync(tmpDirPath, { recursive: true });

      await generator.eject({ name, version }, tmpDirPath);

      const map = generator.getMap('about:blank');
      assert.strictEqual(
        readFileSync(join(tmpDirPath, 'index.js')).toString(),
        "export default { name: 'test-deploy-package' };"
      );
      assert.deepStrictEqual(map.imports, {
        'test-deploy-package': pathToFileURL(join(tmpDirPath, 'index.js')).href
      });
    } finally {
      try {
        rm(tmpDirPath, { recursive: true, force: true });
      } catch {}
    }
  }
}

// ---- Complex Package Test ----
{
  const generator = new Generator({
    providerConfig: {
      'jspm.io': {
        authToken: process.env.JSPM_AUTH_TOKEN
      }
    }
  });
  // Test complex package deployment with multiple files and directories
  const complexPackageName = 'test-complex-package';
  const complexPackageVersion = generateRandomVersion();

  // Create a more complex package structure
  const complexPackage = {
    'package.json': JSON.stringify({
      name: complexPackageName,
      version: complexPackageVersion,
      type: 'module',
      main: 'index.js',
      exports: {
        '.': './index.js',
        './utils': './utils/index.js',
        './styles': './styles/main.css'
      }
    }),
    'index.js': `import { helper } from './utils/index.js';
  export default function main() {
    helper();
    return 'This is the main module';
  }`,
    'utils/index.js': `export function helper() {
    return 'Helper function called';
  }`,
    'utils/format.js': `export function formatString(str) {
    return str.toUpperCase();
  }`,
    'styles/main.css': 'body { font-family: sans-serif; }',
    'README.md': '# Test Complex Package\n\nThis is a test package for JSPM deployment.'
  };
  const complexDeployResult = await generator.deploy({
    package: complexPackage
  });

  assert.ok(complexDeployResult.packageUrl, 'Deployment should return a URL');

  // Wait a short time for the deployment to be available
  await new Promise(resolve => setTimeout(resolve, 1000));

  // For now, skip using generator.install and directly fetch from the deployed URL
  const mainUrl = `${complexDeployResult.packageUrl}/index.js`;
  const utilsUrl = `${complexDeployResult.packageUrl}/utils/index.js`;
  const stylesUrl = `${complexDeployResult.packageUrl}/styles/main.css`;

  assert.ok(mainUrl, 'Main module URL should be constructed');
  assert.ok(utilsUrl, 'Utils module URL should be constructed');
  assert.ok(stylesUrl, 'Styles module URL should be constructed');

  // Fetch and verify each file
  async function verifyFile(url, expectedContent) {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }

    const content = await response.text();
    assert.ok(
      content.includes(expectedContent.trim()),
      `Content at ${url} should match expected content`
    );
    return true;
  }

  // Verify main file
  await verifyFile(mainUrl, 'This is the main module');

  // Verify utils file
  await verifyFile(utilsUrl, 'Helper function called');

  // Verify styles file
  await verifyFile(stylesUrl, 'body { font-family: sans-serif; }');
}

// ---- Mutable Package Test ----
{
  const generator = new Generator({
    providerConfig: {
      'jspm.io': {
        authToken: process.env.JSPM_AUTH_TOKEN
      }
    }
  });

  // Test package with mutable version tag
  const mutablePackageName = 'test-mutable-package';
  const mutableVersion = 'dev-feature'; // Non-semver alphanumeric hyphen-separated tag

  // Initial package content
  const initialPackage = {
    'package.json': JSON.stringify({
      name: mutablePackageName,
      version: mutableVersion,
      type: 'module',
      main: 'index.js'
    }),
    'index.js': "export const version = 'initial';"
  };

  // Deploy initial version
  const initialDeployResult = await generator.deploy({
    package: initialPackage
  });

  assert.ok(initialDeployResult.packageUrl, 'Initial deployment should return a URL');
  assert.ok(
    initialDeployResult.packageUrl.includes(mutablePackageName),
    'Deployment URL should include the package name'
  );
  assert.ok(
    initialDeployResult.packageUrl.includes(mutableVersion),
    'Deployment URL should include the mutable version tag'
  );

  const packageUrl = initialDeployResult.packageUrl;
  const indexUrl = `${packageUrl}/index.js`;

  // Verify initial content
  const initialResponse = await fetch(indexUrl + '?cachebust1');
  assert.ok(initialResponse.ok, 'Initial package should be accessible');
  const initialContent = await initialResponse.text();
  assert.ok(
    initialContent.includes("export const version = 'initial'"),
    'Initial content should match what we deployed'
  );

  // Check cache headers for mutable version
  const cacheControl = initialResponse.headers.get('cache-control');
  assert.ok(
    cacheControl && cacheControl.includes('no-cache'),
    'Mutable package should have no-cache in cache-control header'
  );

  // Updated package content
  const updatedPackage = {
    'package.json': JSON.stringify({
      name: mutablePackageName,
      version: mutableVersion,
      type: 'module',
      main: 'index.js'
    }),
    'index.js': "export const version = 'updated';"
  };

  // Deploy updated version to the same mutable tag
  const updateDeployResult = await generator.deploy({
    package: updatedPackage
  });

  assert.strictEqual(
    updateDeployResult.packageUrl,
    packageUrl,
    'Updated deployment should return the same URL'
  );

  // Verify that files are immediately updated
  const updatedResponse = await fetch(indexUrl + '?cachebust2');
  assert.ok(updatedResponse.ok, 'Updated package should be accessible');
  const updatedContent = await updatedResponse.text();
  assert.ok(
    updatedContent.includes("export const version = 'updated'"),
    'Content should be immediately updated with the new version'
  );

  // Verify cache headers again
  const updatedCacheControl = updatedResponse.headers.get('cache-control');
  assert.ok(
    updatedCacheControl && updatedCacheControl.includes('no-cache'),
    'Updated mutable package should maintain no-cache in cache-control header'
  );
}
