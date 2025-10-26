import { Socket } from "net";
import { RESP } from "../resp";

interface ReplicaConnection {
  socket: Socket;
  offset: number;
  lastAckOffset: number;
}

export class PropagationManager {
  private replicas: ReplicaConnection[] = [];
  private masterOffset: number = 0;

  public addReplica(socket: Socket): void {
    this.replicas.push({ socket, offset: 0, lastAckOffset: 0 });
    console.log(`Replica connected, Total replicas: ${this.replicas.length}`);

    socket.on('close', () => {
      this.removeReplica(socket);
    })
  }

  private removeReplica(socket: Socket): void {
    this.replicas = this.replicas.filter( r => r.socket !== socket);
    console.log(`Replica disconnected, Total replicas: ${this.replicas.length}`);
  }

  public isReplicaConnection(socket: Socket): boolean {
    return this.replicas.some(r => r.socket === socket);
  }

  public handleReplicaAck(socket: Socket, offset: number): void {
    const replica = this.replicas.find(r => r.socket === socket);
    if (replica) {
      replica.lastAckOffset = offset;
      console.log(`Replica ACK received: offset ${offset}`);
    }
  }

  public propagateCommand(command: string[]): void {
    if (this.replicas.length === 0) return;

    const encoded = RESP.encode.array(command);
    console.log(`Propagating command to ${this.replicas.length} replica(s): `, command);

    this.masterOffset += encoded.length;

    for (const replica of this.replicas) {
      try {
        replica.socket.write(encoded);
        replica.offset = this.masterOffset;
      } catch (error) {
        console.error('Error propagating to replica: ', error);
      }
    }
  }

  public async waitForReplicas(numReplicas: number, timeoutMs: number): Promise<number> {
    // no replicas?, or still no write commands? return replicas count
    if (numReplicas === 0 || this.masterOffset === 0) {
      return this.replicas.length;
    }

    const getackCommand = RESP.encode.array(['REPLCONF', 'GETACK', '*']);
    for (const replica of this.replicas) {
      try {
        replica.socket.write(getackCommand);
      } catch (error) {
        console.error("Error sending GETACK: ", error);
      }
    }

    const startTime = Date.now();

    while(Date.now() - startTime < timeoutMs) {
      const syncedReplicas = this.replicas.filter(
        r => r.lastAckOffset >= this.masterOffset
      ).length;

      if (syncedReplicas >= numReplicas) return syncedReplicas;
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    return this.replicas.filter(r => r.lastAckOffset >= this.masterOffset).length;
  }

  public isWriteCommand(commandName: string): boolean {
    const writeCommands = [
      'SET', 'DEL', 'INCR',
      'LPUSH', 'RPUSH', 'LPOP', 'BLPOP',
      'XADD',
    ]

    return writeCommands.includes(commandName.toUpperCase());
  }

  public getReplicaCount(): number {
    return this.replicas.length;
  }
}

export const propagationManager = new PropagationManager();