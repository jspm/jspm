import c from "picocolors";
import { clearCache as _clearCache } from "@jspm/generator";
import type { BaseFlags } from "./cli.ts";

export default async function clearCache(flags: BaseFlags) {
  _clearCache();
  !flags.silent && console.warn(`${c.green("Ok:")} Cache cleared successfully`);
}
