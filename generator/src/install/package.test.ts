import { newPackageTarget, type PackageTarget } from './package.js';
import assert from 'node:assert';

const parentPkgUrl = new URL('file:///app/');

function rangeStr(target: string, registry: string, pkgName?: string) {
  const { pkgTarget } = newPackageTarget(target, parentPkgUrl, registry, pkgName);
  return (pkgTarget as PackageTarget).range.toString();
}

// npm's "v" prefix on versions
for (const [value, expected] of [
  ['4.17.20', '4.17.20'],
  ['v4.17.20', '4.17.20'],
  ['v4.17.20-beta.1', '4.17.20-beta.1'],
  ['V4.17.20', 'V4.17.20'],
  ['v4beta', 'v4beta'],
  ['vnext', 'vnext'],
  ['next', 'next']
]) {
  assert.strictEqual(rangeStr(value, 'npm', 'lodash-es'), expected, value);
}

// install targets
assert.strictEqual(rangeStr('lodash-es@v4.17.20', 'npm'), '4.17.20');
assert.strictEqual(rangeStr('npm:lodash-es@v4.17.20', 'npm'), '4.17.20');

// "v" tags are retained for non-npm registries
assert.strictEqual(rangeStr('github:lodash/lodash@v4.17.20', 'npm', 'lodash'), 'v4.17.20');
assert.strictEqual(rangeStr('lodash/lodash@v4.17.20', 'npm'), 'v4.17.20');
assert.strictEqual(rangeStr('v4.17.20', 'github', 'lodash'), 'v4.17.20');
