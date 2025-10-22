import { Socket } from "net";

interface QueuedCommand {
  command: string[];
}

export class TransactionManager {
  private transactions: Map<Socket, QueuedCommand[]>;
  
  constructor() {
    this.transactions = new Map();
  }

  public startTransaction(connection: Socket): boolean {
    // Already in a transaction?
    if (this.transactions.has(connection)) return false;

    this.transactions.set(connection, []);
    return true;
  }

  public isInTransaction(connection: Socket): boolean {
    return this.transactions.has(connection);
  }

  public queueCommand(connection: Socket, command: string[]): boolean {
    const queue = this.transactions.get(connection);
    if (!queue) return false;
    queue.push({ command });
    return true;
  }

  // returns queued commands, doesn't "EXEC" them yet
  public executeTransaction(connection: Socket): QueuedCommand[] | null {
    const queue = this.transactions.get(connection);
    if (!queue) return null;
    this.transactions.delete(connection);
    return queue;
  }

  public discardTransaction(connection: Socket): boolean {
    if (!this.transactions.has(connection)) return false;
    this.transactions.delete(connection);
    return true;
  }

  public cleanupConnection(connection: Socket): void {
    this.transactions.delete(connection);
  }
}

export const transactionManger = new TransactionManager();