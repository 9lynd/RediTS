import { RESP } from "../resp"
import { transactionManger } from "../transaction/transactionManager"
import { Socket } from "net";

export function discardCommand(args: string[], connection: Socket): string {
  if(args.length) {
    return RESP.encode.error("ERR wrong number of arguments for 'DISCARD' command");
  }
  const discarded = transactionManger.discardTransaction(connection);
  if (!discarded) {
    return RESP.encode.error("ERR DISCARD without MULTI");
  }
  return RESP.encode.simpleString("OK");
}