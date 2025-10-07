import { RESP } from "../resp";

export function echoCommand(args: string[]): string {
  if (args.length === 0) {
    return RESP.encode.error(`ERR: wrong number of arguments for echo`)
  }

  return RESP.encode.bulkString(args[0]);
}