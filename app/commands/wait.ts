import { RESP } from "../resp";
import { propagationManager } from "../replication/propagation";
import { Socket } from "net";

export async function waitCommand(args: string[], connection: Socket): Promise<string> {
  if (args.length < 2) {
    return RESP.encode.error("ERR wrong number of arguments for 'wait' command");
  }

  const numReplicas = parseInt(args[0]);
  const timeoutMs = parseInt(args[1]);

  if (isNaN(numReplicas) || isNaN(timeoutMs)) {
    return RESP.encode.error("ERR timeout is not an integer or out of range");
  }

  const syncedCount = await propagationManager.waitForReplicas(numReplicas, timeoutMs);
  
  return RESP.encode.integer(syncedCount);
}