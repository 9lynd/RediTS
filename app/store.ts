type RedisValue = string | string[];

export class Store {
  private data: Map<string, RedisValue>;

  constructor() {
    this.data = new Map<string, string>();
  }

  public set(key: string, value: string, expiresAt?: Date): void {
    this.data.set(key, value);
    if(expiresAt) {
      setTimeout(() => this.delete(key), expiresAt.getTime() - Date.now());
    }
  }

  public get(key: string): string | null {
    const value = this.data.get(key);
    if (typeof value === 'string') {
      return value;
    }
    return null;
  }

  public rpush(key: string, ...values: string[]): number {
    const exist = this.data.get(key);
    if (exist === undefined) {
      this.data.set(key, [...values]);
      return values.length;
    }
    if(Array.isArray(exist)) {
      exist.push(...values);
      return exist.length
    }
    throw new Error("WRONGTYPE Operation against a key holding the wrong number of values")
  }

  public has(key: string): boolean {
    return this.data.has(key);
  }

  public delete(key: string): boolean {
    return this.data.delete(key);
  }

  public size(): number {
    return this.data.size;
  }

  public clear(): void {
    this.data.clear();
  }
}

// ensure all commands use the same data store
// create a singleton instance that will be shared across the app
export const store = new Store();