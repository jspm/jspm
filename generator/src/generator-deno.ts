import babel from "@babel/core";
import babelPresetTs from "@babel/preset-typescript";
import babelPluginSyntaxImportAttributes from "@babel/plugin-syntax-import-attributes";
import { createHash } from "crypto";
import { realpath } from "fs";
import { pathToFileURL } from "url";

import { setBabel as setBabelCjs } from "./trace/cjs.js";
import { setBabel as setBabelTs } from "./trace/ts.js";
import { setPathFns } from "./trace/resolver.js";

setBabelCjs(babel);
setBabelTs(babel, babelPresetTs, babelPluginSyntaxImportAttributes);
setPathFns(realpath, pathToFileURL);

export * from "./generator.js";
