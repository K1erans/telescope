export class InvalidatableCache<Value> {
  private readonly values = new Map<string, Value>();
  private generation = 0;

  get(key: string): Value | undefined {
    return this.values.get(key);
  }

  beginLoad(): number {
    return this.generation;
  }

  setIfCurrent(key: string, value: Value, generation: number): boolean {
    if (generation !== this.generation) {
      return false;
    }
    this.values.set(key, value);
    return true;
  }

  invalidate(): void {
    this.generation++;
    this.values.clear();
  }
}
