import { test } from "node:test";
import assert from "assert";
import { wrapCommand } from "../src/utils.ts";

test("wrapCommand should properly wrap commands", () => {
  // A simple test for wrapCommand functionality
  const testFn = (a: number, b: number) => a + b;
  const wrapped = wrapCommand(testFn);
  assert.strictEqual(typeof wrapped, "function");
});
