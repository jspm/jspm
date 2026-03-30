/// <reference types="node" />
/// <reference types="node" />
export interface CachedResponse {
    url: string;
    status: number;
    statusText: string;
    ok: boolean;
    headers: Headers;
    text(): string;
    json(): any;
    arrayBuffer(): ArrayBuffer;
}
export declare class CachedResponseImpl implements CachedResponse {
    #private;
    readonly url: string;
    readonly status: number;
    readonly statusText: string;
    readonly ok: boolean;
    readonly headers: Headers;
    constructor(url: string, status: number, statusText: string, headers: Headers, body: Buffer);
    text(): string;
    json(): any;
    arrayBuffer(): ArrayBuffer;
}
