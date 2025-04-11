_The JSPM Generator API is the low-level core library for working with import map generation._

Usually, the generator is used indirectly through a wrapper project such as the [JSPM CLI](https://jspm.org/docs/jspm-cli), [Online Generator](https://generator.jspm.io), [CDN Generation API](https://jspm.org/cdn/api#generator) or an [integration project](https://jspm.org/docs/integrations).

* GitHub: https://github.com/jspm/generator
* npm: https://npmjs.org/package/@jspm/generator

## Installation

JSPM Generator can be installed via npm:

```
npm install @jspm/generator
```

or it can be consumed via an [import map directly in browsers or Deno](https://generator.jspm.io/#U2NhYGBkDM0rySzJSU1hcMgqLsjVT0/NSy1KLMkvcjDUM9AzBgB0jFHUJAA).

JSPM Generator ships as an ES module package only.

## API

The generator package exposes a [Generator class](/docs/generator/stable/classes/Generator), which is initialized with [Generation Options](/docs/generator/stable/interfaces/GeneratorOptions).

Methods on the generator class apply install operations such as [generator.install()](/docs/generator/stable/classes/Generator.html#install).

Extraction methods like [getMap()](/docs/generator/stable/classes/Generator.html#getMap) are used to retrieve the final generated import map.

Static API functions are provided for stateless commands.

For comprehensive API documentation, select one of these APIs from the right-hand side documentation listing for further information.

### Providers

The global provider can be configured by the [defaultProvider](/docs/generator/stable/interfaces/GeneratorOptions.html#defaultProvider) generator option.

For multi-provider projects, scoped providers can be configured via the [providers option](/docs/generator/stable/interfaces/GeneratorOptions.html#providers).

[Custom providers](/docs/generator/stable/interfaces/GeneratorOptions.html#customProviders) can be defined based on provider hooks.

## Logging

For debugging, a logger is provided via `generator.logStream`:

```js
const generator = new Generator();

(async () => {
  for await (const { type, message } of generator.logStream()) {
    console.log(`${type}: ${message}`);
  }
})();
```

Log events recorded include `trace`, `resolve` and `install`.

Note that the log messages are for debugging and not currently part of the semver contract of the project.

Alternatively set the environment variable `JSPM_GENERATOR_LOG` to enable default console logging.

## Examples

### Creating Import Maps

```js
import { Generator } from '@jspm/generator';

const generator = new Generator({
  // The URL of the import map, for normalising relative URLs:
  mapUrl: import.meta.url,
  
  // The default CDN to use for external package resolutions:
  defaultProvider: 'jspm',
  
  // The environment(s) to target. Note that JSPM will use these to resolve
  // conditional exports in any package it encounters:
  env: ['production', 'browser', 'module'],
});

// Install the main entry point of the latest version of a package:
await generator.install('react-dom');

// Install a particular entry point of a package:
await generator.install('lit@2/decorators.js');
await generator.install({ target: 'lit@2', subpath: './html.js' });

// Install to a custom alias:
await generator.install({ target: 'react@16', alias: 'react16' });

// Install from a local package:
await generator.install({
  target: './packages/local-pkg',
  alias: 'mypkg'
  subpath: './feature',
});

// Output the import map:
console.log(JSON.stringify(generator.getMap(), null, 2));
```
```json
{
  "imports": {
    "lit/decorators.js": "https://ga.jspm.io/npm:lit@2.0.0-rc.1/decorators.js",
    "lit/html.js": "https://ga.jspm.io/npm:lit@2.0.0-rc.1/html.js",
    "mypkg/feature": "./packages/local-pkg/feature.js",
    "react": "./local/react.js",
    "react16": "https://ga.jspm.io/npm:react@16.14.0/index.js",
  },
  "scopes": { ... }
}
```

### Linking Local Dependencies

```js
// file: ./mapping.js
import * as lit from 'lit';
```

```js
// file: generate.js
import { Generator } from "@jspm/generator";

const generator = new Generator({
  mapUrl: import.meta.url,
  env: ['production', 'module', 'browser'],
});

await generator.link('./mapping.js');
console.log(JSON.stringify(generator.getMap(), null, 2));
```
```json
{
  "imports": {
    "lit": "https://ga.jspm.io/npm:lit@2.6.1/index.js"
  },
  "scopes": { ... }
}
```

### Input Maps

An import map can be passed to the generator with the `inputMap` option, which will be used as the initial resolution solution. Further installs will use these resolutions where possible, like a lock file:

```js
const generator = new Generator({
  env: ['production', 'module', 'browser'],
  inputMap: {
    "imports": {
      "react": "https://ga.jspm.io/npm:react@17.0.1/dev.index.js"
    },
    "scopes": {
      "https://ga.jspm.io/": {
        "object-assign": "https://ga.jspm.io/npm:object-assign@4.1.0/index.js"
      }
    }
  }
});

await generator.install('lit');
console.log(JSON.stringify(generator.getMap(), null, 2));
```
```json
{
  "imports": {
    "lit": "https://ga.jspm.io/npm:lit@2.2.7/index.js",
    "react": "https://ga.jspm.io/npm:react@17.0.1/index.js"
  },
  "scopes": { ... }
}
```
### Providers

```js
import { Generator } from '@jspm/generator';

const generator = new Generator({
  mapUrl: import.meta.url,
  env: ['production', 'browser', 'module'],
  defaultProvider: 'nodemodules',
});

// Assuming you have run 'npm install lit' in the same directory already:
await generator.install('lit');
console.log(JSON.stringify(generator.getMap(), null, 2));
```
```json
{
  "imports": {
    "lit": "./node_modules/lit/index.js"
  },
  "scopes": { ... }
}
```

### HTML Injection

```js
import { generator } from '@jspm/generator';

const generator = new generator({
  mapurl: import.meta.url,
  env: ['production', 'browser', 'module'],
});

console.log(await generator.htmlinject(`
  <!doctype html>
  <script type="module">import 'react'</script>
`, {
  trace: true,
  esmoduleshims: true
  
}));
```
```html
<!doctype html>
<!-- generated by @jspm/generator - https://github.com/jspm/generator -->
<script async src="https://ga.jspm.io/npm:es-module-shims@1.6.3/dist/es-module-shims.js" crossorigin="anonymous"></script>
<script type="importmap">
{
  "imports": {
    "react": "https://ga.jspm.io/npm:react@18.2.0/index.js"
  }
}
</script>
<script type="module">import 'react'</script>
```

### Module Preloading and Integrity

```js
import { Generator } from '@jspm/generator';

const generator = new Generator({
  mapUrl: import.meta.url,
  env: ['production', 'browser', 'module'],
  inputMap: {
    imports: {
      react: "https://ga.jspm.io/npm:react@18.2.0/index.js",
    }
  },
});

console.log(await generator.htmlInject(`<!doctype html>`, {
  esModuleShims: true,
  integrity: true,
  preload: true,
}));
```

```html
<!doctype html><!-- Generated by @jspm/generator - https://github.com/jspm/generator -->
<script async src="https://ga.jspm.io/npm:es-module-shims@1.6.3/dist/es-module-shims.js" crossorigin="anonymous" integrity="sha384-R+gcUA3XvOcqevJ058aqe2+i0fMjGxEgXlstX2GcuHSwkr03d6+GPKDBbCTlt9pt"></script>
<script type="importmap">
{
  "imports": {
    "react": "https://ga.jspm.io/npm:react@18.2.0/index.js"
  }
}
</script>
<link rel="modulepreload" href="https://ga.jspm.io/npm:react@18.2.0/index.js" integrity="sha384-i6bD4Fz1JxnWeeJ6W+zAMk/LgkWeHJ/B+22ykUkjaKgPupuM4UDtOU/2bSE8sEyC" />
```
