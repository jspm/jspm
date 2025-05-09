// @ts-ignore
import version from "../version.js";
import path from "node:path";
import { homedir } from "node:os";
import process from "node:process";
import makeFetchHappen from "make-fetch-happen";
import { readFileSync, rmdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { WrappedResponse } from "./fetch.js";

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

const emptyHeaders = new Headers();
const jsonHeaders = new Headers([["content-type", "application/json"]]);

function sourceResponse(url: string, buffer: string | Buffer): WrappedResponse {
  return {
    url,
    headers: url.endsWith(".json") ? jsonHeaders : emptyHeaders,
    status: 200,
    ok: true,
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

let _readdir;
const dirResponse = (path) => ({
  // we use a 204 status for directory responses on the filesystem
  // which support listing. This is only a local internal convention,
  // not intended for external URLs.
  status: 204,
  async text() {
    return "";
  },
  async json() {
    // the JSON response for a directory is its listing array
    if (!_readdir) {
      ({ readdir: _readdir } = await import("node:fs/promises"));
    }
    return await _readdir(path);
  },
  arrayBuffer() {
    return new ArrayBuffer(0);
  },
});

export const fetch = async function (url: URL, opts?: Record<string, any>) {
  const urlString = url.toString();
  const protocol = urlString.slice(0, urlString.indexOf(":") + 1);
  switch (protocol) {
    case "file:":
      const path = fileURLToPath(urlString);
      if (urlString.endsWith("/")) {
        try {
          readFileSync(path);
          return { status: 404, statusText: "Directory does not exist" };
        } catch (e) {
          if (e.code === "EISDIR") return dirResponse(path);
          throw e;
        }
      }
      try {
        return sourceResponse(urlString, readFileSync(path));
      } catch (e) {
        if (e.code === "EISDIR") return dirResponse(path);
        if (e.code === "ENOENT" || e.code === "ENOTDIR")
          return { status: 404, statusText: e.toString() };
        return { status: 500, statusText: e.toString() };
      }
    case "data:":
      return sourceResponse(
        urlString,
        decodeURIComponent(urlString.slice(urlString.indexOf(",") + 1))
      );
    case "node:":
      return sourceResponse(urlString, "");
    case "http:":
    case "https:":
      // @ts-ignore
      return _fetch(url, opts);
  }
};
