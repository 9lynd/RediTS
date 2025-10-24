import { RESP } from "../resp";
import { replicationConfig } from "../replication/config";

export function psyncCommand(args: string[]): string {
  if (args.length !== 2) {
    return RESP.encode.error("ERR wrong number of arguments for 'PSYNC' command");
  }

  const [replId, offset] = args;

  const response = `FULLRESYNC ${replicationConfig.replId} ${replicationConfig.replOffset}`;
  return RESP.encode.simpleString(response);
}