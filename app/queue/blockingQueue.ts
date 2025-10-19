import { RESP } from "../resp";

interface BlockedClient {
  keys: string[];
  resolve: (value: string) => void;
  timeoutId: NodeJS.Timeout | null;
  checkInterval: NodeJS.Timeout;
  timestamp: number;
}

export class BlockingQueueManager {
  private blockedClients: Map<string, BlockedClient[]>;

  constructor() {
    this.blockedClients = new Map();
  }

  public blockClient(
    keys: string[],
    timeoutMs: number,
    checkElement: (key: string) => string | null
  ): Promise<string> {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const client: BlockedClient = {
        keys,
        resolve,
        timeoutId: null,
        checkInterval: null as any,
        timestamp: Date.now()
      };

      if(timeoutMs !== Infinity) {
        client.timeoutId = setTimeout(() => {this.unblockClient(client, "*-1\r\n")}, timeoutMs);
      }

      for (const key of keys) {
        if(!this.blockedClients.has(key)) {
          this.blockedClients.set(key, []);
        }
        this.blockedClients.get(key)!.push(client);
      }

      const pollInterval = 100;

      client.checkInterval = setInterval(() => {
        if (timeoutMs !== Infinity && Date.now() - startTime >= timeoutMs){ return; }

        for (const key of keys) {
          const queue = this.blockedClients.get(key);
          if (!queue || queue[0] !== client){ continue }

          const element = checkElement(key);

          if(element !== null) {
            const response = RESP.encode.array([key, element]);
            this.unblockClient(client, response);
            return;
          }
        }
      }, pollInterval);
    });
  }

  private unblockClient(client: BlockedClient, response: string): void {
    if (client.timeoutId) {
      clearTimeout(client.timeoutId);
    }
    if (client.checkInterval) {
      clearInterval(client.checkInterval);
    }

    // Remove client from all queues
    for (const key of client.keys) {
      const queue = this.blockedClients.get(key);
      if (queue) {
        const index = queue.indexOf(client);
        if (index !== 1){
          queue.splice(index, 1);
        }
        // clean up empty queues
        if(queue.length === 0) {
          this.blockedClients.delete(key)
        }
      }
    }

    client.resolve(response);
  }

  public getBlockedCount(key: string): number {
    return this.blockedClients.get(key)?.length || 0;
  }
}

// singleton instance
export const blockingQueue = new BlockingQueueManager();