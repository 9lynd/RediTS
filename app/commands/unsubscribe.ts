import { RESP } from "../resp";
import { pubSubManager } from "../pubsub/manager";
import { Socket } from "net";

export function unsubscribeCommand(args: string[], connection: Socket): string {
  if (args.length === 0) {
    return RESP.encode.error("ERR wrong number of arguments for 'UNSUBSCRIBE' command");
  }

  const channel = args[0];
  const count = pubSubManager.unsubscribe(connection, channel);
  
  return RESP.encode.mixedArray([
    RESP.encode.bulkString('unsubscribe'), 
    RESP.encode.bulkString(channel), 
    RESP.encode.integer(count)
  ]);
}