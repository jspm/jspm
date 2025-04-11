import "@jspm/generator";

// keepalive
setInterval(() => {
  fetch("/tests/ping");
}, 3000);

(async () => {
  let tests = await (await fetch("/tests/list")).json();

  mocha.setup("tdd");
  mocha.set;
  mocha.allowUncaught();
  self.assert = function (val) {
    equal(!!val, true);
  };
  assert.equal = equal;
  assert.ok = assert;
  function equal(a, b) {
    if (a !== b) throw new Error('Expected "' + a + '" to be "' + b + '"');
  }
  self.fail = function (msg) {
    throw new Error(msg);
  };

  // Keep track of reasons for failure in a global:
  self.__TEST_FAILURES__ = [];

  suite("Browser Tests", async function () {
    this.timeout(120_000);
    for (const name of tests) {
      if (name.startsWith("deno") || name.startsWith("node")) continue;
      test(name, async function () {
        try {
          await import("./" + name + ".js");
        } catch (err) {
          __TEST_FAILURES__.push([name, err.stack]);
          throw err;
        }
      });
    }
  });

  mocha.run(function (failures) {
    if (failures) {
      fetch("/error?" + failures, {
        method: "POST",
        body: JSON.stringify(__TEST_FAILURES__),
      });
    } else {
      fetch("/done");
    }
  });
})();
