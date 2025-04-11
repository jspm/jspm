import { analyzeHtml } from "@jspm/generator";
import { deepStrictEqual } from "assert";

const analysis = analyzeHtml(`

<script type="importmap">
  {
    "imports": {
      "react": "/react.js"
    }
  }
</script>

<script async src="https://ga.jspm.io/npm:es-module-shims@0.12.8/dist/es-module-shims.min.js" integrity="sha384-Gba99Cy/cyqL1MpdnMzkUKYpebrPnBrQ5xnOoqJJNQstoxJQjAE4xgr80AiDYuTA" crossorigin="anonymous"></script>

<link rel=modulepreload href="./subdep.js" integrity="asdf" />

<script type="module">
import 'react';
</script>

<script type="module" src="./local.js"></script>
<script type="module" src="/absolute.js"></script>

<script>
import('/dynamic');
</script>

`);

deepStrictEqual(analysis.map, {
  start: 2,
  end: 95,
  attrs: {
    type: {
      start: 10,
      end: 25,
      name: "type",
      quote: '"',
      value: "importmap",
    },
  },
  json: {
    imports: {
      react: "/react.js",
    },
  },
  newScript: false,
  style: {
    indent: "  ",
    newline: "\n",
    quote: '"',
    tab: "  ",
    trailingNewline: "\n",
  },
});

deepStrictEqual(analysis.preloads, [
  {
    start: 310,
    end: 372,
    attrs: {
      rel: {
        start: 316,
        end: 333,
        quote: "",
        name: "rel",
        value: "modulepreload",
      },
      href: {
        start: 334,
        end: 351,
        quote: '"',
        name: "href",
        value: "./subdep.js",
      },
      integrity: {
        start: 353,
        end: 368,
        quote: '"',
        name: "integrity",
        value: "asdf",
      },
    },
  },
]);

deepStrictEqual(
  [...analysis.staticImports],
  ["react", "./local.js", "/absolute.js"]
);

deepStrictEqual([...analysis.dynamicImports], ["/dynamic"]);

deepStrictEqual(analysis.esModuleShims, {
  attrs: {
    async: {
      name: "async",
      quote: "",
      value: null,
      start: 105,
      end: 110,
    },
    crossorigin: {
      name: "crossorigin",
      quote: '"',
      value: "anonymous",
      start: 275,
      end: 297,
    },
    integrity: {
      name: "integrity",
      quote: '"',
      value:
        "sha384-Gba99Cy/cyqL1MpdnMzkUKYpebrPnBrQ5xnOoqJJNQstoxJQjAE4xgr80AiDYuTA",
      start: 191,
      end: 273,
    },
    src: {
      name: "src",
      quote: '"',
      value:
        "https://ga.jspm.io/npm:es-module-shims@0.12.8/dist/es-module-shims.min.js",
      start: 111,
      end: 189,
    },
  },
  end: 308,
  start: 97,
});
