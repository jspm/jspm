import assert from "assert";
import { Replacer } from "../../lib/common/str.js";

{
  const replacer = new Replacer("hello world");
  replacer.replace(0, 5, "Hey");
  replacer.replace(6, 11, "Earth");

  assert.strictEqual(replacer.source, "Hey Earth");

  replacer.replace(0, 5, "Does this work?");
  assert.strictEqual(replacer.source, "Does this work? Earth");

  replacer.replace(0, 5, "Hmm");
  assert.strictEqual(replacer.source, "Hmm Earth");

  replacer.replace(11, 11, " World ");
  assert.strictEqual(replacer.source, "Hmm Earth World ");

  assert.strictEqual(
    replacer.source.slice(replacer.idx(1), replacer.idx(10)),
    "mm Eart"
  );

  replacer.remove(0, 5, true);
  assert.strictEqual(replacer.source, "Earth World ");

  replacer.remove(6, 11, true);
  assert.strictEqual(replacer.source, "");

  replacer.replace(0, 11, "howdy");
  assert.strictEqual(replacer.source, "howdy");
}
