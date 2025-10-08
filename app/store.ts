export class Store {
  private data: Map<string, string>;

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
    return value !== undefined ? value : null;
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