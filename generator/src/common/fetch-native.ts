import { WrappedFetch, wrappedFetch } from "./fetch-common.js";

export const fetch: WrappedFetch = wrappedFetch(globalThis.fetch);

export const clearCache = () => {};
