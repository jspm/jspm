export interface WrappedResponse {
  status: number;
  statusText?: string;
  text?(): Promise<string>;
  json?(): Promise<any>;
  arrayBuffer?(): ArrayBuffer;
}

export type FetchFn = (
  url: URL | string,
  ...args: any[]
) => Promise<WrappedResponse | globalThis.Response>;

export type WrappedFetch = ((
  url: URL | string,
  ...args: any[]
) => Promise<WrappedResponse | globalThis.Response>) & {
  arrayBuffer: (
    url: URL | string,
    ...args: any[]
  ) => Promise<ArrayBuffer | null>;
  text: (url: URL | string, ...args: any[]) => Promise<string | null>;
};

let retryCount = 5,
  poolSize = 100;

export function setRetryCount(count: number) {
  retryCount = count;
}

export function setFetchPoolSize(size: number) {
  poolSize = size;
}

/**
 * Wraps a fetch request with pooling, and retry logic on exceptions (emfile / network errors).
 */
export function wrappedFetch(fetch: FetchFn): WrappedFetch {
  const wrappedFetch = async function (url: URL | string, ...args: any[]) {
    url = url.toString();
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
  wrappedFetch.arrayBuffer = async function (url, ...args) {
    url = url.toString();
    let retries = 0;
    try {
      await pushFetchPool();
      while (true) {
        try {
          var res = await fetch(url, ...args);
        } catch (e) {
          if (retries++ >= retryCount) throw e;
          continue;
        }
        switch (res.status) {
          case 200:
          case 304:
            break;
          // not found = null
          case 404:
            return null;
          default:
            throw new Error(`Invalid status code ${res.status}`);
        }
        try {
          return await res.arrayBuffer();
        } catch (e) {
          if (
            (retries++ >= retryCount && e.code === "ERR_SOCKET_TIMEOUT") ||
            e.code === "ETIMEOUT" ||
            e.code === "ECONNRESET" ||
            e.code === "FETCH_ERROR"
          ) {
          }
        }
      }
    } finally {
      popFetchPool();
    }
  };
  wrappedFetch.text = async function (url, ...args) {
    const arrayBuffer = await this.arrayBuffer(url, ...args);
    if (!arrayBuffer) return null;
    return new TextDecoder().decode(arrayBuffer);
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
