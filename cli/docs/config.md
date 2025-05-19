# Configuration

## Conditions

Conditions allow for configuring the conditional resolutions (ie [conditional exports](https://nodejs.org/dist/latest/docs/api/packages.html#conditional-exports) and imports) for resolved packages.

The default environments for all operations are `development`, `browser` and `module`.

To configure different environments, you can provide one or more `-C` or `--conditions` flags with additional environment names to resolve. Environments like `development` and `production` are mutuallly exclusive in that setting one will override the other. To disable the default `browser` or `module` environments, you can set the `no-browser` or `no-module` environments respectively.

## Providers

Providers are used to resolve package _canonical names_ (such as `npm:react@18.2.0`) to _resolved URLs_ (such as [https://ga.jspm.io/npm:react@18.2.0/](https://ga.jspm.io/npm:react@18.2.0/package.json)). The default provider for all operations is `jspm.io`, which uses the [jspm.io](https://jspm.io) CDN for package resolutions. To configure a different provider, you can provide a `-p` or `--provider` flag.

The following providers are supported:

- `jspm.io`
- `jspm.io#system`
- `nodemodules`
- `esm.sh`
- `unpkg`
- `jsdelivr`

Most of these providers will resolve against their corresponding CDNs. For instance, `esm.sh` uses the [esm.sh](https://esm.sh) CDN, `unpkg` uses the [UNPKG](https://unpkg.com) CDN, and so on.

The `nodemodules` provider resolves packages against the local `node_modules` folder, allowing you to generate import maps for local development. This will only work in the browser if all dependencies are ESM dependencies.

## Resolutions

Resolutions may be used to remap package _names_ to particular package _targets_. For instance, the latest version of one of your secondary dependencies may be broken, and you want to pin it to an older version, or even to a different package altogether. To do this, you can provide one or more `-r` or `--resolution` flags, with arguments `[package_name]=[target_version]` or `[package_name]=[registry]:[name]@[target-range]`. Package specifiers can take the full syntax described under [`jspm install`](#jspm-install).

When a resolution is set, _all_ dependencies on that package will take the given remapping, no matter what the the resolution context is. Note that this may cause packages to break in unexpected ways if you violate their dependency constraints.

### Examples

```
  jspm install -r react=npm:preact@10.13.2
```

Installs an import of `react` as `npm:preact@10.13.2` into the import map under the name `react`. Note that this will happen even if we have specified a particular version for `react`. Like Node.js resolutions these override all other sources of versioning information.

### Build

The build command can be used to build a project from the import map, which will include all dependencies by resolving them from CDN against the import map.

The command operates in two modes,

```sh
jspm build --output dir
```

Custom Rollup configurations are not yet supported, work is still in progress to abstract the JSPM RollupJS plugin for composition with other build plugins.

## Preload Tags and Integrity Attributes

It is always recommended to generate modulepreload tags for production apps using import maps. This avoids the latency waterfall for dependency discovery by inlining preload hints for all statically loaded modules upfront.

In addition, preload tags can also include [integrity attributes](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) for static dependency integrity.

When performing HTML injection operations (ie when the `--output` import map is an HTML file), `--preload` and `--integrity` can be used to handle this injection automatically.
