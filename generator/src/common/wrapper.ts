import { fetch } from "../common/fetch.js";
import { parse, init } from "es-module-lexer";

export async function getMaybeWrapperUrl(moduleUrl, fetchOpts) {
  await init;
  const source = await (await fetch(moduleUrl, fetchOpts)).text();
  const [imports, , facade] = parse(source);
  if (facade && imports.length) {
    try {
      return new URL(imports[0].n, moduleUrl).href;
    } catch {}
  }
  return moduleUrl;
}
