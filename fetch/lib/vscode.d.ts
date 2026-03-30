export { clearCache } from './native.js';
export declare const fetch: (url: URL, opts?: Record<string, any>) => Promise<Response | {
    status: number;
    text(): Promise<string>;
    json(): Promise<any>;
    arrayBuffer(): ArrayBuffer;
} | {
    status: number;
    statusText: any;
}>;
