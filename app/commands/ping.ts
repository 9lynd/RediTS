import { RESP } from "../resp";

export function pingCommand(args: string[]): string {
  // No arguments: return simple string "PONG"
  if (args.length === 0) {
    return RESP.encode.simpleString("PONG");
  }

  return RESP.encode.bulkString(args[0]);
}