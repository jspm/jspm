import { lookup } from '@jspm/generator';
import assert from 'assert';

const { install, resolved } = await lookup('jquery@3.5');

assert.strictEqual(install.target.registry, 'npm');
assert.strictEqual(install.target.name, 'jquery');
assert.strictEqual(install.target.range, '3.5');
assert.strictEqual(install.subpath, '.');
assert.strictEqual(install.alias, 'jquery');
assert.strictEqual(resolved.registry, 'npm');
assert.strictEqual(resolved.name, 'jquery');
assert.strictEqual(resolved.version, '3.5.1');
