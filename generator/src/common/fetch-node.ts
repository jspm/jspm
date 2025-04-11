// @ts-ignore
import version from "../version.js";
import { wrappedFetch, WrappedFetch } from "./fetch-common.js";
import path from "path";
import { homedir } from "os";
import process from "process";
import makeFetchHappen from "make-fetch-happen";
import { readFileSync, rmdirSync } from "fs";
import { Buffer } from "buffer";

let cacheDir: string;
if (process.platform === "darwin")
  cacheDir = path.join(homedir(), "Library", "Caches", "jspm");
else if (process.platform === "win32")
  cacheDir = path.join(
    process.env.LOCALAPPDATA || path.join(homedir(), "AppData", "Local"),
    "jspm-cache"
  );
else
  cacheDir = path.join(
    process.env.XDG_CACHE_HOME || path.join(homedir(), ".cache"),
    "jspm"
  );

export function clearCache() {
  rmdirSync(path.join(cacheDir, "fetch-cache"), { recursive: true });
}

const _fetch = makeFetchHappen.defaults({
  cacheManager: path.join(cacheDir, "fetch-cache"),
  headers: { "User-Agent": `jspm/generator@${version}` },
});

function sourceResponse(buffer: string | Buffer) {
  return {
    status: 200,
    async text() {
      return buffer.toString();
    },
    async json() {
      return JSON.parse(buffer.toString());
    },
    arrayBuffer() {
      if (typeof buffer === "string")
        return new TextEncoder().encode(buffer.toString()).buffer;
      return new Uint8Array(
        buffer.buffer,
        buffer.byteOffset,
        buffer.byteLength
      );
    },
  };
}

const dirResponse = {
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

export const fetch: WrappedFetch = wrappedFetch(async function (
  url: URL,
  opts?: Record<string, any>
) {
  const urlString = url.toString();
  const protocol = urlString.slice(0, urlString.indexOf(":") + 1);
  let source: string | Buffer;
  switch (protocol) {
    case "file:":
      if (urlString.endsWith("/")) {
        try {
          readFileSync(new URL(urlString));
          return { status: 404, statusText: "Directory does not exist" };
        } catch (e) {
          if (e.code === "EISDIR") return dirResponse;
          throw e;
        }
      }
      try {
        return sourceResponse(readFileSync(new URL(urlString)));
      } catch (e) {
        if (e.code === "EISDIR") return dirResponse;
        if (e.code === "ENOENT" || e.code === "ENOTDIR")
          return { status: 404, statusText: e.toString() };
        return { status: 500, statusText: e.toString() };
      }
    case "data:":
      return sourceResponse(
        decodeURIComponent(urlString.slice(urlString.indexOf(",") + 1))
      );
    case "node:":
      return sourceResponse("");
    case "http:":
    case "https:":
      // @ts-ignore
      return _fetch(url, opts);
  }
});
