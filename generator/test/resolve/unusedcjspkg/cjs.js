// This file actually uses CJS globals:
function test() {
  module.exports = { a: "b" };
}

test();
require("asdf");
