import { RESP } from "../resp";
import { transactionManger } from "../transaction/transactionManager";
import { Socket } from "net";

export function multiCommand(args: string[], connection: Socket): string {
  if (args.length) {
    return RESP.encode.error("ERR wrong number of arguments for 'MULTI' command");
  }

  transactionManger.startTransaction(connection);
  return RESP.encode.simpleString("OK");
}