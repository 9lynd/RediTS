import { RESP } from "../resp";
import { pubSubManager } from "../pubsub/manager";
import { Socket } from "net";

export function pingCommand(args: string[], connection?: Socket): string {
  // check if in subscribe mode
  if(connection && pubSubManager.isSubscribed(connection)) {
    return RESP.encode.mixedArray([RESP.encode.bulkString('pong'), RESP.encode.bulkString('')]);
  }
  // No arguments: return simple string "PONG"
  if (args.length === 0) {
    return RESP.encode.simpleString("PONG");
  }

  return RESP.encode.bulkString(args[0]);
}