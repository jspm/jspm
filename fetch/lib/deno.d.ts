export declare function clearCache(): void;
export declare const fetch: (url: URL, ...args: any[]) => Promise<Response | {
    status: number;
    text(): Promise<string>;
    json(): Promise<any>;
    arrayBuffer(): ArrayBufferLike;
    statusText?: undefined;
} | {
    status: number;
    statusText: any;
}>;
