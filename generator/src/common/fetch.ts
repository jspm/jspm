// @ts-ignore
import { fetch as fetchImpl, clearCache } from "#fetch";

export type FetchFn = (
  url: URL | string,
  ...args: any[]
) => Promise<WrappedResponse | globalThis.Response>;

export type WrappedFetch = (
  url: URL | string,
  ...args: any[]
) => Promise<WrappedResponse | globalThis.Response>;

export interface WrappedResponse {
  url: string;
  headers: Headers;
  ok: boolean;
  status: number;
  statusText?: string;
  text?(): Promise<string>;
  json?(): Promise<any>;
  arrayBuffer?(): ArrayBuffer;
}

let retryCount = 5,
  poolSize = 100;

export function setRetryCount(count: number) {
  retryCount = count;
}

export function setFetchPoolSize(size: number) {
  poolSize = size;
}

/**
 * Allows customizing the fetch implementation used by the generator.
 */
export function setFetch(fetch: typeof globalThis.fetch | WrappedFetch) {
  _fetch = wrappedFetch(fetch as WrappedFetch);
}

export type SourceData = Record<string, string | ArrayBuffer>;

const virtualSources: Record<string, SourceData> = {};

/**
 * Allows virtual sources to be defined into the wrapped fetch implementation.
 */
export function setVirtualSourceData(urlBase: string, sourceData: SourceData) {
  virtualSources[urlBase.endsWith("/") ? urlBase : urlBase + "/"] = sourceData;
}

const emptyHeaders = new Headers();
const jsonHeaders = new Headers([["content-type", "application/json"]]);

function sourceResponse(
  url: string,
  buffer: string | ArrayBuffer
): WrappedResponse {
  return {
    url,
    ok: true,
    headers: url.endsWith(".json") ? jsonHeaders : emptyHeaders,
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
      return new Uint8Array(buffer);
    },
  };
}

/**
 * Wraps a fetch request with pooling, retry logic on exceptions (emfile / network errors),
 * and source virtualization.
 */
function wrappedFetch(fetch: FetchFn): WrappedFetch {
  const wrappedFetch = async function (
    url: URL | string,
    ...args: any[]
  ): Promise<WrappedResponse | Response> {
    url = url.toString();
    let matchedVirtual = false;

    for (const virtualBase of Object.keys(virtualSources)) {
      if (url.startsWith(virtualBase)) {
        const virtualFileData = virtualSources[virtualBase];
        let subdir = url.slice(virtualBase.length);
        const source = virtualFileData[subdir];
        if (source) return sourceResponse(url, source);

        // check if we have files within this virtual source path as a folder
        // and if so return the file listing as a 204 listing (internal non-public convention)
        let dirFiles: string[] | null = null;
        if (!subdir.endsWith("/") && subdir.length) subdir += "/";
        for (const file of Object.keys(virtualFileData)) {
          if (file.startsWith(subdir)) {
            dirFiles = dirFiles || [];
            let filename = file.slice(subdir.length);
            if (filename.indexOf("/") !== -1) {
              filename = filename.slice(0, filename.indexOf("/"));
              if (dirFiles.includes(filename)) continue;
            }
            dirFiles.push(filename);
          }
        }
        if (dirFiles) {
          return {
            // we use a 204 status for directory responses on the filesystem
            // which support listing. This is only a local internal convention,
            // not intended for external URLs.
            ok: true,
            status: 204,
            headers: emptyHeaders,
            async text() {
              return "";
            },
            async json() {
              return dirFiles;
            },
            arrayBuffer() {
              return new ArrayBuffer(0);
            },
          } as WrappedResponse;
        }

        // we allow fallthrough to other virtual source bases
        // that is, virtual source bases are allowed to nest eachother
        // this may not be useful in which case we can remove
        matchedVirtual = true;
      }
    }
    if (matchedVirtual) {
      return {
        url,
        ok: false,
        headers: emptyHeaders,
        status: 404,
        statusText: "Virtual source not found",
      };
    }
    let retries = 0;
    try {
      await pushFetchPool();
      while (true) {
        try {
          return await fetch(url, ...args);
        } catch (e) {
          if (retries++ >= retryCount) throw e;
        }
      }
    } finally {
      popFetchPool();
    }
  };
  return wrappedFetch;
}

// restrict in-flight fetches to a pool of 100
let p = [];
let c = 0;
function pushFetchPool() {
  if (++c > poolSize) return new Promise((r) => p.push(r));
}
function popFetchPool() {
  c--;
  if (p.length) p.shift()();
}

let _fetch: WrappedFetch = wrappedFetch(fetchImpl);

export { clearCache, _fetch as fetch };
