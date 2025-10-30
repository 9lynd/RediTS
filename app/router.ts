import { RESP } from "./resp";
import { 
  echoCommand,
  pingCommand,
  setCommand,
  getCommand, 
  rpushCommand, 
  lrangeCommand, 
  lpushCommand, 
  llenCommand, 
  lpopCommand, 
  blpopCommand,
  typeCommand,
  xaddCommand,
  xrangeCommand,
  xreadCommand,
  incrCommand,
  multiCommand,
  discardCommand,
  execCommand,
  infoCommand,
  replconfCommand,
  psyncCommand,
  waitCommand,
  configCommand,
  keysCommand,
  subscribeCommand,
  unsubscribeCommand,
  publishCommand,
  zaddCommand,
  zcardCommand,
  zrangeCommand,
  zremCommand,
  zrankCommand,
  zscoreCommand
} from "./commands";
import type { Socket } from "net";
import { transactionManger } from "./transaction/transactionManager";
import { replicationConfig } from "./replication/config";
import { propagationManager } from "./replication/propagation";
import { pubSubManager } from "./pubsub/manager";

export class CommandRouter {
  private commands: Map<string, (args: string[]) => string | Promise<string>>;

  constructor () {
    this.commands = new Map();

    this.register("ECHO", echoCommand);
    this.register("PING", pingCommand);
    this.register("SET", setCommand);
    this.register("GET", getCommand);
    this.register("RPUSH", rpushCommand);
    this.register("LRANGE", lrangeCommand);
    this.register("LPUSH", lpushCommand);
    this.register("LLEN", llenCommand);
    this.register("LPOP", lpopCommand);
    this.register("BLPOP", blpopCommand);
    this.register("TYPE", typeCommand);
    this.register("XADD", xaddCommand);
    this.register("XRANGE", xrangeCommand);
    this.register("XREAD", xreadCommand);
    this.register("INCR", incrCommand);
    this.register("INFO", infoCommand);
    this.register("REPLCONF", replconfCommand);
    this.register("PSYNC", psyncCommand);
    this.register("CONFIG", configCommand);
    this.register("KEYS", keysCommand);
    this.register("PUBLISH", publishCommand);
    this.register("ZADD", zaddCommand);
    this.register("ZCARD", zcardCommand);
    this.register("ZRANGE", zrangeCommand);
    this.register("ZREM", zremCommand);
    this.register("ZRANK", zrankCommand);
    this.register("ZSCORE", zscoreCommand);
  }

  private register(name: string, handler: (args: string[]) => string | Promise<string>): void {
    this.commands.set(name.toUpperCase(), handler);
  }

  public execute(command: string[], connection: Socket): string | Promise<string> {
    if (command.length === 0) {
      return RESP.encode.error("ERR: no command provided!");
    }

    const commandName = command[0].toUpperCase();
    const args = command.slice(1);

    if (propagationManager.isReplicaConnection(connection)) {
    if (commandName === 'REPLCONF' && args[0]?.toUpperCase() === 'ACK') {
      const offset = parseInt(args[1] || '0');
      propagationManager.handleReplicaAck(connection, offset);
      return '';
    }
    return '';
  }

    if (pubSubManager.isSubscribed(connection)) {
      const allowedCommands = ['SUBSCRIBE', 'UNSUBSCRIBE', 'PING', 'QUIT'];

      if (!allowedCommands.includes(commandName)) {
        return RESP.encode.error( 
          `ERR Can't execute '${commandName.toLowerCase()}': only (P|S)SUBSCRIBE / (P|S)UNSUBSCRIBE / PING / QUIT / RESET are allowed in this context`
        );
      }
    }

    if (commandName === 'SUBSCRIBE') {
      return subscribeCommand(args, connection);
    }
    if (commandName === 'UNSUBSCRIBE') {
      return unsubscribeCommand(args, connection);
    }
    if (commandName === 'MULTI') {
      return multiCommand(args, connection);
    }
    if (commandName === 'DISCARD') {
      return discardCommand(args, connection);
    }
    if (commandName === 'EXEC') {
      return execCommand(args, connection, (cmd) => {
        return this.executeInternal(cmd);
      })
    }

    if (commandName === 'PSYNC') {
      return psyncCommand(args, connection);
    }

    if (commandName === 'WAIT') {
      return waitCommand(args, connection);
    }
    
    if (transactionManger.isInTransaction(connection)) {
      transactionManger.queueCommand(connection, command);
      return RESP.encode.simpleString("QUEUED");
    }
    if (commandName === 'PING') {
      if(pubSubManager.isSubscribed(connection)) {
        return RESP.encode.mixedArray([RESP.encode.bulkString('pong'), RESP.encode.bulkString('')]);
      }
      return pingCommand(args);
    }

    const result = this.executeInternal(command);

    // if in master node, propagate write commands to replicas
    if (replicationConfig.isMaster() && propagationManager.isWriteCommand(commandName)) {
      propagationManager.propagateCommand(command);
    }

    return result;
  }

  public executeInternal(command: string[]): string | Promise<string> {
    const commandName = command[0].toUpperCase();
    const args = command.slice(1);

    const handler = this.commands.get(commandName);

    if (!handler) {
      return RESP.encode.error(`ERR: unknown command ${command[0]}`);
    }

    try {
      return handler(args);
    }catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return RESP.encode.error(`ERR: ${errorMessage}`);
    }
  }
}