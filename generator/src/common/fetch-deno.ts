import { fileURLToPath } from "url";
import { wrappedFetch, WrappedFetch } from "./fetch-common.js";

export function clearCache() {}

export const fetch: WrappedFetch = wrappedFetch(async function (
  url: URL,
  ...args: any[]
) {
  const urlString = url.toString();
  if (
    urlString.startsWith("file:") ||
    urlString.startsWith("data:") ||
    urlString.startsWith("node:")
  ) {
    try {
      let source: string;
      if (urlString.startsWith("file:")) {
        // @ts-ignore - can only resolve Deno when running in Deno
        source = (await Deno.readTextFile(fileURLToPath(urlString))) as string;
      } else if (urlString.startsWith("node:")) {
        source = "";
      } else {
        source = decodeURIComponent(
          urlString.slice(urlString.indexOf(",") + 1)
        );
      }
      return {
        status: 200,
        async text() {
          return source.toString();
        },
        async json() {
          return JSON.parse(source.toString());
        },
        arrayBuffer() {
          return new TextEncoder().encode(source.toString()).buffer;
        },
      };
    } catch (e) {
      if (e.code === "EISDIR")
        return {
          status: 200,
          async text() {
            return "";
          },
          async json() {
            throw new Error("Not JSON");
          },
          arrayBuffer() {
            return new ArrayBuffer(0);
          },
        };
      if (e.name === "NotFound")
        return { status: 404, statusText: e.toString() };
      return { status: 500, statusText: e.toString() };
    }
  } else {
    return globalThis.fetch(urlString, ...args);
  }
});
