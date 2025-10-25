export class OffsetTracker {
  private offset: number = 0;

  public addBytes(bytes: number): void {
    this.offset += bytes;
  }

  public getOffset(): number {
    return this.offset;
  }

  public reset(): void {
    this.offset = 0;
  }
}

export const replicaOffsetTracker = new OffsetTracker();