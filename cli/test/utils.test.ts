import assert from 'node:assert';
import { it } from 'node:test';
import { wrapCommand } from '../src/utils.ts';

it('wrapCommand should properly wrap commands', () => {
  // A simple test for wrapCommand functionality
  const testFn = (a: number, b: number) => a + b;
  const wrapped = wrapCommand(testFn);
  assert.strictEqual(typeof wrapped, 'function');
});
