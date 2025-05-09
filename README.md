<div align="center">
  <img style="display: inline-block; width: 100px; vertical-align: middle; margin-top: -1em;" src="https://jspm.org/jspm.png"/>
  <h1 style="display: inline-block">JSPM</h1>
<p><strong>Package management tools for the JSPM project, supporting import map package management.</strong></p>
<a href="https://jspm.org/getting-started">Getting Started</a> | <a href="https://jspm.org/docs/jspm-cli">Documentation</a> | <a href="https://jspm.org/faq">FAQ</a>
<br />
<hr style="width:50%"/>
</div>
<br />

This monorepo includes the following tools:

* [`cli`](./cli): `jspm` CLI tool
* [`generator`](./generator): JSPM Generator import map generation library (`@jspm/generator`)
* [`import-map`](./import-map): JSPM Import Map low-level manipulation library (`@jspm/import-map`)

### Features

* **Local Linking**: map packages to your local `node_modules` folder
* **Common CDNs**: Resolve against common CDNs like [jspm.io](https://jspm.io/), [jsDelivr](https://jsdelivr.com), [UNPKG](https://unpkg.com/) and [more](#customProviders)
* **Universal Semantics**: Implements [universal CDN resolution](https://jspm.org/docs/cdn-resolution.md) semantics, based on an extension of the Node.js resolution
* **Conditional Resolution**: Map different versions of a module based on environment
* **Dependency Versioning**: Respects the version constraints in local and remote `package.json` files
* **Package Entrypoints**: Handles node-style package exports, imports and own-name resolution
* **Importmap Injection**: Import map extraction/injection into HTML files, with module preloading and integrity attributes.

### Documentation

* JSPM CLI: https://jspm.org/docs/jspm-cli
* JSPM Generator: https://jspm.org/docs/generator
* Import Map: https://jspm.org/docs/import-map
* Getting Started: https://jspm.org/getting-started

## Contributing

Build and test workflows use [Chomp](https://chompbuild.com).

## License

Apache-2.0
