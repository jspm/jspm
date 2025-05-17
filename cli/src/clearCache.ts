import c from "picocolors";
import { clearCache as _clearCache } from "@jspm/generator";
import type { BaseFlags } from "./cli.ts";

export default async function clearCache(flags: BaseFlags) {
  _clearCache();
  !flags.quiet && console.warn(`${c.green("Ok:")} Cache cleared successfully`);
}
