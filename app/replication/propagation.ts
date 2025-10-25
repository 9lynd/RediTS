import { Socket } from "net";
import { RESP } from "../resp";

interface ReplicaConnection {
  socket: Socket;
  offset: number;
}

export class PropagationManager {
  private replicas: ReplicaConnection[] = [];

  public addReplica(socket: Socket): void {
    this.replicas.push({ socket, offset: 0 });
    console.log(`Replica connected, Total replicas: ${this.replicas.length}`);

    socket.on('close', () => {
      this.removeReplica(socket);
    })
  }

  private removeReplica(socket: Socket): void {
    this.replicas = this.replicas.filter( r => r.socket !== socket);
    console.log(`Replica disconnected, Total replicas: ${this.replicas.length}`);
  }

  public propagateCommand(command: string[]): void {
    if (this.replicas.length === 0) return;

    const encoded = RESP.encode.array(command);
    console.log(`Propagating command to ${this.replicas.length} replica(s): `, command);

    for (const replica of this.replicas) {
      try {
        replica.socket.write(encoded);
      } catch (error) {
        console.error('Error propagating to replica: ', error);
      }
    }
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