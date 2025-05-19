The JSPM CLI is the main command-line import map package management tool for JSPM.

> For a complete guide and introduction to the JSPM CLI and import map package management, see the [getting started guide](/getting-started).

For import map generation API usage or in other environments, see the low-level Generator project which is the internal import map package management and generation API which this CLI project wraps. The [Generator API documentation](/docs/generator) also provides a more thorough details of the operations.

## Installation

The following command installs JSPM globally:

```
npm install -g jspm
```

# Commands

For a full list of commands and supported options, run `jspm --help`. For help with a specific command, add the `-h` or `--help` flag to the command invocation.

## JSPM Install Explained

By default, JSPM operates on `importmap.js` which is automatically created if it does not exist. This is considered the main import map on which install, serve and build operations are performed.

The `jspm install` operation will read this `importmap.js`, operate on it, and then save it back. Options can be used to customize how the import map is resolved and used to link the application, and also how it is rendered.

To customize the location of the import map, the `--map` flag can be used. For example to load from `my-import-map.json` instead use `jspm install --map my-import-map.json`. This file will then be saved back.

To customize the location of the output import map, the `--out` flag can be used. For example, `jspm install --map my-import-map.json --out app.js` will read the import map from the JSON file, perform all install operations from that source of truth for version operations, and then save the result as an import map injection in `app.js`.
 