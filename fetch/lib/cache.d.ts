import { type CachedResponse } from './response.js';
export declare class Cache {
    #private;
    constructor(opts?: {
        cacheDir?: string;
        memoryOnly?: boolean;
    });
    get(url: string): CachedResponse | undefined;
    set(url: string, response: CachedResponse, immutable?: boolean): void;
    delete(url: string): void;
    clear(): void;
    dispose(): void;
}
