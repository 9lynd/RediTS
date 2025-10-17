export interface StreamEntry {
  id: string;                          
  millisecondsTime: number;            
  sequenceNumber: number;              
  fields: Map<string, string>;         
}

export interface StreamData {
  entries: StreamEntry[];
}

export class StreamStore {
  private streams: Map<string, StreamData>

  constructor () {
    this.streams = new Map();
  }

  public xadd(key: string, id: string, fields: Map<string, string>): string {
    const { millisecondsTime, sequenceNumber} = this.parseId(id);
    if (millisecondsTime === 0 && sequenceNumber === 0) {
      throw new Error("ERR The ID specified in XADD must be greater than 0-0");
    }

    const stream = this.streams.get(key);

    if (stream === undefined) {
      const newStream: StreamData = {
        entries: [{
          id,
          millisecondsTime,
          sequenceNumber,
          fields
        }]
      };
      this.streams.set(key, newStream);
      return id;
    }

    if (stream.entries.length > 0) {
      const lastEntry = stream.entries[stream.entries.length - 1];
      this.validateIdGreaterThan(millisecondsTime, sequenceNumber, lastEntry);
    }

    stream.entries.push({
      id,
      millisecondsTime,
      sequenceNumber, 
      fields
    });

    return id;
  }

  private parseId(id: string): { millisecondsTime: number; sequenceNumber: number } {
    const idParts = id.split('-');
    
    if (idParts.length !== 2) {
      throw new Error("ERR Invalid stream ID specified as stream command argument");
    }

    const millisecondsTime = parseInt(idParts[0]);
    const sequenceNumber = parseInt(idParts[1]);

    if (isNaN(millisecondsTime) || isNaN(sequenceNumber)) {
      throw new Error("ERR Invalid stream ID specified as stream command argument");
    }

    return { millisecondsTime, sequenceNumber };
  }

  /**
    Validates that a new ID is strictly greater than the last entry's ID
   */
  private validateIdGreaterThan(
    millisecondsTime: number,
    sequenceNumber: number,
    lastEntry: StreamEntry
  ): void {
    // First compare millisecondsTime
    if (millisecondsTime < lastEntry.millisecondsTime) {
      throw new Error("ERR The ID specified in XADD is equal or smaller than the target stream top item");
    }

    // If millisecondsTime is equal, compare sequenceNumber
    if (millisecondsTime === lastEntry.millisecondsTime) {
      if (sequenceNumber <= lastEntry.sequenceNumber) {
        throw new Error("ERR The ID specified in XADD is equal or smaller than the target stream top item");
      }
    }
  }

  public has(key: string): boolean {
    return this.streams.has(key);
  }

  public get(key: string): StreamData | undefined {
    return this.streams.get(key);
  }

  public delete(key: string): boolean {
    return this.streams.delete(key);
  }

  public clear(): void {
    this.streams.clear();
  }

  public size(): number {
    return this.streams.size;
  }
}

export const streamStore = new StreamStore();