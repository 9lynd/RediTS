type RedisValue = string | string[];

export class Store {
  private data: Map<string, RedisValue>;

  constructor() {
    this.data = new Map<string, RedisValue>();
  }

  public set(key: string, value: string, expiresAt?: Date): void {
    if (expiresAt) {
      const timeoutMs = expiresAt.getTime() - Date.now();
      if (timeoutMs <= 0) return;

      this.data.set(key, value);
      const MAX_TIMEOUT = 2147483647;
      if (timeoutMs < MAX_TIMEOUT){
      setTimeout(() => this.delete(key), timeoutMs);
    }
    } else {
      this.data.set(key, value);
    }
  }

  public get(key: string): string | null {
    const value = this.data.get(key);
    if (typeof value === 'string') {
      return value;
    }
    return null;
  }

  public keys(): string[] {
    return Array.from(this.data.keys());
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

  public lpush(key: string, ...values: string[]): number {
    const exist = this.data.get(key);
    if(exist === undefined) {
      this.data.set(key, [...values].reverse());
      return values.length;
    }

    if (Array.isArray(exist)) {
      exist.unshift(...values.reverse());
      return exist.length;
    }

    throw new Error("WRONGTYPE Operation against a key holding the wrong number of values");
  }

  public lrange(key: string, start: number, stop: number): string[] {
    const exist = this.data.get(key);
    if (exist === undefined) {
      return [];
    }
    // key exists, but it's not a list
    if(!Array.isArray(exist)) {
      throw new Error("WRONGTYPE Operation against a key holding the wrong number of values");
    }
    const length = exist.length;
    let startIndex = start < 0 ? length + start : start;
    let stopIndex = stop < 0 ? length + stop : stop;

    // Clamp indexes to a valid range [0, length - 1]
    startIndex = Math.max(0, startIndex);
    stopIndex = Math.min(length - 1, stopIndex);

    // check if start is after stop, or start is beyond array
    if (startIndex > stopIndex || startIndex >= length) {
      return [];
    }
    return exist.slice(startIndex, stopIndex + 1);
  }

  public llen(key: string): number {
    const exist = this.data.get(key);
    if (exist === undefined) {
      return 0;
    }
    if (!Array.isArray(exist)) {
      throw new Error("WRONGTYPE Operation against a key holding the wrong number of values");
    }
    return exist.length;
  }

  public lpop(key: string, count: number = 1): string | string[] | null {
    const exist = this.data.get(key);
    if (exist === undefined || exist.length === 0) {
      return null;
    }
    if (!Array.isArray(exist)) {
      throw new Error("WRONGTYPE Operation against a key holding the wrong number of values");
    }
    const index = Math.min(count, exist.length);
    const removed = exist.splice(0, index);

    if (exist.length === 0) {
      this.data.delete(key);
    }

    if (count === 1) {
      return removed[0];
    }

    return removed;
  }

  public has(key: string): boolean {
    return this.data.has(key);
  }

  public hasElements(key: string): boolean {
    const exist = this.data.get(key);
    return Array.isArray(exist) && exist.length > 0;
  }

  public type(key: string): string | null {
    const exist = this.data.get(key);
    if (typeof exist === undefined) return null;
    if (typeof exist === 'string') return 'string';
    if (Array.isArray(exist)) return 'list';
    return null;
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