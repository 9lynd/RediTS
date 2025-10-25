import { RESP } from "../resp";
import { replicaOffsetTracker } from "../replication/offset";

export function replconfCommand(args: string[]): string {
  if (!args.length) {
    return RESP.encode.error("ERR wrong number of arguments for 'REPLCONF' command");
  }
  const subCommand = args[0].toUpperCase();
  if (subCommand === 'GETACK') {
    const offset = replicaOffsetTracker.getOffset();
    return RESP.encode.array(['REPLCONF', 'ACK', offset.toString()]);
  }
  
  return RESP.encode.simpleString("OK");
}