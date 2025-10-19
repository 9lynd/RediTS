import { RESP } from "../resp";

interface BlockedStreamClient {
  streamKeys: string[];                      
  lastIds: string[];                         
  resolve: (value: string) => void;          // Function to resolve the promise
  timeoutId: NodeJS.Timeout | null;          // Timeout timer
  checkInterval: NodeJS.Timeout;             // Interval for checking streams
  timestamp: number;                         // When this client started blocking (for FIFO)
}

export class StreamBlockingQueueManager {
  private blockedClients: Map<string, BlockedStreamClient[]>;

  constructor() {
    this.blockedClients = new Map();
  }

  public blockClient(
    streamKeys: string[],
    lastIds: string[],
    timeoutMs: number,
    checkNewEntries: (keys: string[], ids: string[]) => Array<[string, any[]]> | null
  ): Promise<string> {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const client: BlockedStreamClient = {
        streamKeys,
        lastIds,
        resolve,
        timeoutId: null,
        checkInterval: null as any, // Will be set below
        timestamp: Date.now()
      };

      // Set up timeout if not infinite
      if (timeoutMs !== Infinity) {
        client.timeoutId = setTimeout(() => {
          this.unblockClient(client, RESP.encode.nullArray());
        }, timeoutMs);
      }

      for (const key of streamKeys) {
        if (!this.blockedClients.has(key)) {
          this.blockedClients.set(key, []);
        }
        this.blockedClients.get(key)!.push(client);
      }

      const pollInterval = 100; // Check every 100ms
      
      client.checkInterval = setInterval(() => {
        // Check if timeout reached
        if (timeoutMs !== Infinity && Date.now() - startTime >= timeoutMs) {
          return; // Timeout will handle it
        }

        const newData = checkNewEntries(streamKeys, lastIds);
        
        if (newData !== null && newData.length > 0) {
          // Got new data! Encode and unblock
          const response = RESP.encode.streams(newData);
          this.unblockClient(client, response);
        }
      }, pollInterval);
    });
  }


  private unblockClient(client: BlockedStreamClient, response: string): void {
    // Clear the timeout if it exists
    if (client.timeoutId) {
      clearTimeout(client.timeoutId);
    }

    // Clear the check interval
    if (client.checkInterval) {
      clearInterval(client.checkInterval);
    }

    // Remove this client from all queues
    for (const key of client.streamKeys) {
      const queue = this.blockedClients.get(key);
      if (queue) {
        const index = queue.indexOf(client);
        if (index !== -1) {
          queue.splice(index, 1);
        }
        // Clean up empty queues
        if (queue.length === 0) {
          this.blockedClients.delete(key);
        }
      }
    }

    // Resolve the promise
    client.resolve(response);
  }


  public getBlockedCount(key: string): number {
    return this.blockedClients.get(key)?.length || 0;
  }
}

export const streamBlockingQueue = new StreamBlockingQueueManager();