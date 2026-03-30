import { type CachedResponse } from './response.js';
export declare function ensureReaddir(): Promise<void>;
export declare function handleFileUrl(url: string): CachedResponse;
export declare function handleDataUrl(url: string): CachedResponse;
export declare function handleNodeUrl(url: string): CachedResponse;
