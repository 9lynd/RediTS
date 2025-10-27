import { RESP } from "../resp";
import { replicationConfig } from "../replication/config";

export function configCommand(args: string[]): string {
  if (args.length < 2) {
    return RESP.encode.error("ERR wrong number of arguments for 'CONFIG' command");
  }

  const subCommand = args[0].toUpperCase();

  if (subCommand === 'GET') {
    const param = args[1].toLowerCase();
    let value: string | null = null;
    if (param === 'dir') {
      value = replicationConfig.dir;
    } else if (param === 'dbfilename') {
      value = replicationConfig.dbfilename;
    }

    if (value !== null) {
      return RESP.encode.array([param, value]);
    }

    return RESP.encode.array([]);
  }
  return RESP.encode.error(`ERR Unknown subcommand: ${subCommand}`);
}