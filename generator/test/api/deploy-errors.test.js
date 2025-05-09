import { Generator } from "@jspm/generator";
import assert from "assert";

// Test validation errors during deployment

// Missing package name
let error;
try {
  const generator = new Generator();
  await generator.deploy({
    package: {
      "package.json": JSON.stringify({ name: "", version: "1.0.0" }),
      "index.js": "export default {}",
    },
  });
  assert.fail("Should have thrown an error for missing package name");
} catch (e) {
  error = e;
}
assert.ok(
  error.message.includes("Package name is required"),
  "Should throw specific error for missing package name"
);

// Missing package version
error = null;
try {
  const generator = new Generator();
  await generator.deploy({
    package: {
      "package.json": JSON.stringify({ name: "test-package", version: "" }),
      "index.js": "export default {}",
    },
  });
  assert.fail("Should have thrown an error for missing package version");
} catch (e) {
  error = e;
}
assert.ok(
  error.message.includes("Package version is required"),
  "Should throw specific error for missing package version"
);

// No files provided
error = null;
try {
  const generator = new Generator();
  await generator.deploy({
    package: {},
    importMap: false,
  });
  assert.fail("Should have thrown an error for empty files");
} catch (e) {
  error = e;
}
assert.ok(
  error.message.includes("At least one file or importMap is required"),
  "Should throw specific error for no files, got " + error.message
);

// Invalid package.json
error = null;
try {
  const generator = new Generator();
  await generator.deploy({
    package: {
      "package.json": "{ invalid: json",
      "index.js": "export default {}",
    },
  });
  assert.fail("Should have thrown an error for invalid package.json");
} catch (e) {
  error = e;
}
assert.ok(
  error.message.includes("Invalid package.json"),
  "Should throw specific error for invalid package.json"
);
