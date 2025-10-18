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

    const actualId = this.generateId(key, id);

    const { millisecondsTime, sequenceNumber} = this.parseId(actualId);
    if (millisecondsTime === 0 && sequenceNumber === 0) {
      throw new Error("ERR The ID specified in XADD must be greater than 0-0");
    }

    const stream = this.streams.get(key);

    if (stream === undefined) {
      const newStream: StreamData = {
        entries: [{
          id: actualId,
          millisecondsTime,
          sequenceNumber,
          fields
        }]
      };
      this.streams.set(key, newStream);
      return actualId;
    }

    if (stream.entries.length > 0) {
      const lastEntry = stream.entries[stream.entries.length - 1];
      this.validateIdGreaterThan(millisecondsTime, sequenceNumber, lastEntry);
    }

    stream.entries.push({
      id: actualId,
      millisecondsTime,
      sequenceNumber, 
      fields
    });

    return actualId;
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

  private generateId(key: string, id: string): string {
    // case: Fully auto-generated IDs
    if (id === '*') {
      const currentTimeMs = Date.now();
      return this.generateIdForTime(key, currentTimeMs);
    }

    // case: Partial auto-generated IDs
    if(id.endsWith('-*')) {
      const timePart = id.slice(0, -2); 
      const millisecondsTime = parseInt(timePart);

      if (isNaN(millisecondsTime)) {
        throw new Error("ERR Invalid stream ID specified as stream command argument");
      }
      return this.generateIdForTime(key, millisecondsTime);
    }

    // case: Explicit ID (no auto-generation)
    return id;
  }

  // Partially auto-generated IDs -> only sequence number auto-generated
  private generateIdForTime (key: string, millisecondsTime: number): string {
    const stream = this.streams.get(key);

    // if time is 0, sequence number starts at 1 instead of default 0
    if (millisecondsTime === 0) {
      if (!stream || stream.entries.length === 0) {
        return '0-1';
      }
    
    const entriesWithTime0 = stream?.entries.filter( e => e.millisecondsTime = 0);
    if (entriesWithTime0?.length === 0) {
      return '0-1';
    }

    const maxSeq = Math.max(...entriesWithTime0.map(e => e.sequenceNumber));
    return `0-${maxSeq + 1}`;
    }

    // for all other times
    if(!stream || stream.entries.length === 0) {
      return `${millisecondsTime}-0`
    }

    const entriesWithSameTime = stream.entries.filter(e => e.millisecondsTime === millisecondsTime);
    if (entriesWithSameTime.length === 0) {
      return `${millisecondsTime}-0`
    }

    // entries exist? increment last sequence number
    const maxSeq = Math.max(...entriesWithSameTime.map(e => e.sequenceNumber));
    return `${millisecondsTime}-${maxSeq + 1}`;
  }

  public xrange(key: string, startId: string, endId: string): StreamEntry[] {
    const stream = this.streams.get(key);
    if (!stream) return [];
    if (startId === '+' || endId === '-') return [];

    const { time: startTime, seq: startSeq } = this.parseRangeId(startId, 'start');
    const { time: endTime, seq: endSeq } = this.parseRangeId(endId, 'end');

    if (startTime > endTime || startTime === endTime && startSeq > endSeq) return [];

    return stream.entries.filter(entry => {
      return this.isInRange(
        entry.millisecondsTime,
        entry.sequenceNumber,
        startTime,
        startSeq,
        endTime,
        endSeq
      );
    });
  }

  private parseRangeId(
    id: string, 
    type: 'start' | 'end'
  ): { time: number; seq: number}
  {

    if (id === '-') return { time: 0, seq: 0 };
    if (id === '+') return { time: Infinity, seq: Infinity };

    const idParts = id.split('-');

    // only time specified
    if (idParts.length === 1) {
      const time = parseInt(idParts[0]);
      if (isNaN(time)) {
        throw new Error("ERR Invalid stream ID specified as stream command argument");
      }
      // sequence: default is 0 for start, and infinity for end
      const seq = type === 'start' ? 0 : Infinity;
      return  { time, seq };
    }

    // full ID is specified: time + sequence
    if (idParts.length === 2) {
      const time = parseInt(idParts[0]);
      const seq = parseInt(idParts[1]);

      if (isNaN(time) || isNaN(seq)) {
        throw new Error("ERR Invalid stream ID specified as stream command argument");
      }

      return { time, seq };
    }
    throw new Error("ERR Invalid stream ID specified as stream command argument");
  }

  // check which entries are in range to return with xrange command
  private isInRange(
    entryTime: number,
    entrySeq: number,
    startTime: number,
    startSeq: number,
    endTime: number,
    endSeq: number
  ): boolean {
    if (entryTime < startTime || entryTime > endTime) return false;
    if (entryTime === startTime && entrySeq < startSeq) return false;
    if (entryTime === endTime && entrySeq > endSeq) return false;

    return true;
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