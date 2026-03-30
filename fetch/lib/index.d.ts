import { type CachedResponse } from './response.js';
export type { CachedResponse } from './response.js';
export { CachedResponseImpl } from './response.js';
export interface FetchOptions {
    immutable?: boolean;
    cache?: 'default' | 'no-store' | 'no-cache' | 'force-cache';
    headers?: Record<string, string>;
}
export interface CreateFetchOptions {
    cacheDir?: string;
    poolSize?: number;
    retryCount?: number;
    memoryOnly?: boolean;
}
export type SourceData = Record<string, string | ArrayBuffer>;
export declare function createFetch(opts?: CreateFetchOptions): {
    fetch: (url: string | URL, fetchOpts?: FetchOptions) => Promise<CachedResponse>;
    clearCache(): void;
    dispose(): void;
    setVirtualSourceData: (urlBase: string, sourceData: SourceData) => void;
    isVirtualUrl: (url: string) => boolean;
};
export declare const fetch: (url: string | URL, fetchOpts?: FetchOptions) => Promise<CachedResponse>;
export declare const clearCache: () => void;
export declare const setVirtualSourceData: (urlBase: string, sourceData: SourceData) => void;
export declare const isVirtualUrl: (url: string) => boolean;
