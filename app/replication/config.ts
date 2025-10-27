export class ReplicationConfig {
  public port: number;
  public role: 'master' | 'slave';
  public masterHost: string | null;
  public masterPort: number | null;
  public replId: string;
  public replOffset: number;
  public dir: string;
  public dbfilename: string;

  constructor() {
    this.port = 6379;
    this.role = 'master';
    this.masterHost = null;
    this.masterPort = null;
    this.replId = this.generateReplId();
    this.replOffset = 0;
    this.dir = '/tmp';
    this.dbfilename = 'dump.rdb';
  }

  public parseArgs(args: string[]): void {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--port') {
        const port = parseInt(args[i + 1]);
        if (!isNaN(port)) {
          this.port = port;
        }
        i++;
      } else if (arg === '--replicaof') {
        const replicaofValue = args[i+1];
        if (replicaofValue) {
          const [host, port] = replicaofValue.split(' ');
          this.role = 'slave';
          this.masterHost = host;
          this.masterPort = parseInt(port);
        }
        i++;
      } else if (arg == '--dir') {
        this.dir = args[i+1];
        i++;
      } else if (arg === '--dbfilename') {
        this.dbfilename = args[i+1];
        i++;
      }
    }
  }

  private generateReplId(): string {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < 40; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result;
  }

  public isMaster(): boolean {
    return this.role === 'master';
  }

  public isReplica(): boolean {
    return this.role === 'slave';
  }
}

export const replicationConfig = new ReplicationConfig();