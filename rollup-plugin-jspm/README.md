# @jspm/plugin-rollup

Standards-based JSPM Rollup plugin, including:

* All module references as URLs
* Support for resolving packages via node_modules or CDN providers
* Fully compatible with Node.js resolution semantics
* Support for import maps
* Support for TypeScript

## Installation

```bash
npm install @jspm/plugin-rollup rollup --save-dev
```

## Usage

rollup.config.js
```js
import jspmRollup from '@jspm/plugin-rollup';

const baseUrl = new URL('./components', import.meta.url);

export default {
  // Important to use "./" here to indicate a local path
  // and not a package. Resolved to baseUrl below.
  input: './main.js',
  plugins: [
    jspmRollup({
      baseUrl,

      // Generator options as per @jspm/generator
      defaultProvider: 'nodemodules',
      env: ['browser'],

      // map of externals to aliased or true
      externals: {
        react: 'custom-react'
      }
    })
  ]
}
```

```
rollup -c
```
