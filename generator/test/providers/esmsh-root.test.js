import { Generator } from "@jspm/generator";
import assert from "assert";

const inputMap = {
  "imports": {
    "react-intl": "https://esm.sh/*react-intl@6.4.4/lib/index.js"
  },
  "scopes": {
    "https://esm.sh/": {
      "@formatjs/ecma402-abstract": "https://esm.sh/*@formatjs/ecma402-abstract@1.17.0/lib/index.js",
      "@formatjs/fast-memoize": "https://esm.sh/*@formatjs/fast-memoize@2.2.0/lib/index.js",
      "@formatjs/icu-messageformat-parser": "https://esm.sh/*@formatjs/icu-messageformat-parser@2.6.0/lib/index.js",
      "@formatjs/icu-skeleton-parser": "https://esm.sh/*@formatjs/icu-skeleton-parser@1.6.0/lib/index.js",
      "@formatjs/intl": "https://esm.sh/*@formatjs/intl@2.9.0/lib/index.js",
      "@formatjs/intl-localematcher": "https://esm.sh/*@formatjs/intl-localematcher@0.4.0/lib/index.js",
      "hoist-non-react-statics": "https://esm.sh/*hoist-non-react-statics@3.3.2/dist/hoist-non-react-statics.cjs.js",
      "intl-messageformat": "https://esm.sh/*intl-messageformat@10.5.0/lib/index.js",
      "react": "https://esm.sh/*react@18.3.1/index.js",
      "react-is": "https://esm.sh/*react-is@16.13.1/index.js",
      "tslib": "https://esm.sh/*tslib@2.8.1/tslib.es6.mjs"
    }
  }
};

const generator = new Generator({
  mapUrl: import.meta.url,
  env: ["production", "browser"],
  inputMap,
});

await generator.install();
