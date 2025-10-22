import { RESP } from "../resp";
import { transactionManger } from "../transaction/transactionManager";
import { Socket } from "net";

export function execCommand(args: string[], 
  connection: Socket, 
  executeCommand: (command: string[]) => string | Promise<string>
): string {
  if (args.length) {
    return RESP.encode.error("ERR wrong number of arguments for 'EXEC' command");
  }

  const queuedCommands = transactionManger.executeTransaction(connection);
  if (queuedCommands === null) {
    return RESP.encode.error("ERR EXEC without MULTI");
  }

  if (queuedCommands.length === 0) {
    return RESP.encode.emptyArray();
  }

  const responses: string[] = [];

  for (const { command } of queuedCommands) {
    const response = executeCommand(command);
    if (response instanceof Promise) {
      responses.push(RESP.encode.error("ERR command in transaction cannot be async"));
    }else {
    responses.push(response);
  }
}
  return RESP.encode.mixedArray(responses);
}