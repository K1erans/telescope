export declare class InvalidatableCache<Value> {
    private readonly values;
    private generation;
    get(key: string): Value | undefined;
    beginLoad(): number;
    setIfCurrent(key: string, value: Value, generation: number): boolean;
    invalidate(): void;
}
//# sourceMappingURL=invalidatablecache.d.ts.map