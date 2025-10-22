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
  execCommand
} from "./commands";
import type { Socket } from "net";
import { transactionManger } from "./transaction/transactionManager";

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
    
    if (transactionManger.isInTransaction(connection)) {
      transactionManger.queueCommand(connection, command);
      return RESP.encode.simpleString("QUEUED");
    }

    return this.executeInternal(command);
  }

  private executeInternal(command: string[]): string | Promise<string> {
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