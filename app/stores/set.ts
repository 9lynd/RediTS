export class SortedSetStore {
  private data: Map<string, Map<string, number>>; // key -> (member -> score)

  constructor() {
    this.data = new Map();
  }

  public add(key: string, member: string, score: number): number {
    if (!this.data.has(key)) {
      this.data.set(key, new Map());
    }

    const members = this.data.get(key)!;
    const existed = members.has(member);
    members.set(member, score);

    return existed ? 0 : 1;
  }

  public remove(key: string, member: string): number {
    const members = this.data.get(key);
    if (!members || !members.has(member)) return 0;

    members.delete(member);
    if (members.size === 0) this.data.delete(key);
    return 1;
  }

  public getScore(key: string, member: string): number | null {
    return this.data.get(key)?.get(member) ?? null;
  }

  public getRank(key: string, member: string): number | null {
    const members = this.data.get(key);
    if (!members || !members.has(member)) return null;

    const sorted = this.getSorted(key);
    return sorted.findIndex(m => m.member === member);
  }

  public getRange(key: string, start: number, stop: number): string[] {
    const sorted = this.getSorted(key);
    const size = sorted.length;

    if (start < 0) start = Math.max(0, size + start);
    if (stop < 0) stop = Math.max(0, size + stop);
    if (start >= size || start > stop) return [];

    stop = Math.min(stop, size - 1);
    return sorted.slice(start, stop + 1).map(m => m.member);
  }

  public cardinality(key: string): number {
    return this.data.get(key)?.size ?? 0;
  }

  private getSorted(key: string): Array<{ member: string; score: number }> {
    const members = this.data.get(key);
    if (!members) return [];

    return Array.from(members.entries())
      .map(([member, score]) => ({ member, score }))
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return a.member.localeCompare(b.member);
      });
  }
}

export const sortedSetStore = new SortedSetStore();