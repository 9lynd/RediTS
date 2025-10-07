import { RESP } from "./resp";
import { echoCommand, pingCommand } from "./commands";

export class CommandRouter {
  private commands: Map<string, (args: string[]) => string>;

  constructor () {
    this.commands = new Map();

    this.register("ECHO", echoCommand);
    this.register("PING", pingCommand);
  }

  private register(name: string, handler: (args: string[]) => string): void {
    this.commands.set(name.toUpperCase(), handler);
  }

  public execute(command: string[]): string {
    if (command.length === 0) {
      return RESP.encode.error("ERR: no command provided!");
    }

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