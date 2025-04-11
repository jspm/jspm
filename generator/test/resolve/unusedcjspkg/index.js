// This file is in a CommonJS resolution context (there's no `"type": "module"`
// field in the package.json), but doesn't actually use any CommonJS globals,
// so we should be able to link this without enabling CJS explicitly:
some = 0;
unbound = 1;
globals = 2;
var require = NOT_REQUIRE;
