export declare class Pool {
    #private;
    constructor(size: number);
    setSize(size: number): void;
    acquire(): Promise<void>;
    release(): void;
}
