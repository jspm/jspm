import * as json from "../common/json.js";
// @ts-ignore
import { readFileSync, writeFileSync } from "fs";
import { Resolver } from "../trace/resolver.js";
import { PackageConfig } from "../install/package.js";

export type DependenciesField =
  | "dependencies"
  | "devDependencies"
  | "peerDependencies"
  | "optionalDependencies";

type ExportsTarget =
  | string
  | null
  | { [condition: string]: ExportsTarget }
  | ExportsTarget[];

export interface PackageJson {
  registry?: string;
  name?: string;
  version?: string;
  main?: string;
  files?: string[];
  browser?: string | Record<string, string>;
  exports?: ExportsTarget | Record<string, ExportsTarget>;
  type?: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export async function updatePjson(
  resolver: Resolver,
  pjsonBase: string,
  updateFn: (
    pjson: PackageJson
  ) => void | PackageJson | Promise<void | PackageJson>
): Promise<boolean> {
  const pjsonUrl = new URL("package.json", pjsonBase);
  let input;
  try {
    input = readFileSync(pjsonUrl).toString();
  } catch (e) {
    input = "{}\n";
  }
  let { json: pjson, style } = json.parseStyled(input);
  pjson = (await updateFn(pjson)) || pjson;
  const output = json.stringifyStyled(pjson, style);
  if (output === input) return false;
  writeFileSync(pjsonUrl, json.stringifyStyled(pjson, style));
  resolver.pcfgs[pjsonBase] = pjson as PackageConfig;
  return true;
}
