import assert from "assert";
import { parseHtml } from "../../lib/html/lexer.js";

{
  const source = `
    <script type="module">test</script>
    <script src="hi" jspm-preload></script>
  `;
  const scripts = parseHtml(source);
  assert.strictEqual(scripts.length, 2);
  assert.strictEqual(scripts[0].attributes.length, 1);
  const attr = scripts[0].attributes[0];
  assert.strictEqual(source.slice(attr.nameStart, attr.nameEnd), "type");
  assert.strictEqual(source.slice(attr.valueStart, attr.valueEnd), "module");
  assert.strictEqual(scripts[0].innerStart, 27);
  assert.strictEqual(scripts[0].innerEnd, 31);
  assert.strictEqual(scripts[0].start, 5);
  assert.strictEqual(scripts[0].end, 40);
  assert.strictEqual(scripts[1].start, 45);
  assert.strictEqual(scripts[1].end, 84);
  assert.strictEqual(scripts[1].attributes.length, 2);
}

{
  const source = `
    <!-- <script>
      <!-- /* </script> */ ->
      console.log('hmm');
    </script
    
    <script>
      console.log('hi');
    </script>
    
    
    -->
    
    <script ta"    ==='s'\\>
      console.log('test');
    </script>
    
    <script <!-- <p type="module">
      export var p = 5;
      console.log('hi');
    </script type="test"
    >
  `;
  const scripts = parseHtml(source);
  assert.strictEqual(scripts.length, 3);
  assert.strictEqual(scripts[0].innerEnd - scripts[0].innerStart, 151);
  assert.strictEqual(scripts[1].attributes.length, 1);
  let attr = scripts[1].attributes[0];
  assert.strictEqual(source.slice(attr.nameStart, attr.nameEnd), 'ta"');
  assert.strictEqual(source.slice(attr.valueStart, attr.valueEnd), "==='s'\\");
  assert.strictEqual(scripts[1].innerStart, 195);
  assert.strictEqual(scripts[1].innerEnd, 227);
  assert.strictEqual(scripts[1].start, 172);
  assert.strictEqual(scripts[1].end, 236);
  assert.strictEqual(scripts[2].attributes.length, 3);
  attr = scripts[2].attributes[0];
  assert.strictEqual(source.slice(attr.nameStart, attr.nameEnd), "<!--");
  assert.strictEqual(attr.valueStart, -1);
  assert.strictEqual(attr.valueEnd, -1);
  attr = scripts[2].attributes[1];
  assert.strictEqual(source.slice(attr.nameStart, attr.nameEnd), "<p");
  assert.strictEqual(attr.valueStart, -1);
  assert.strictEqual(attr.valueEnd, -1);
  attr = scripts[2].attributes[2];
  assert.strictEqual(source.slice(attr.nameStart, attr.nameEnd), "type");
  assert.strictEqual(source.slice(attr.valueStart, attr.valueEnd), "module");
  assert.strictEqual(scripts[2].innerStart, 276);
  assert.strictEqual(scripts[2].innerEnd, 331);
  assert.strictEqual(scripts[2].start, 246);
  assert.strictEqual(scripts[2].end, 356);
}
