import { RESP } from "../resp";
import { store } from "../stores/store";

export function keysCommand(args: string[]): string {
  if (args.length !== 1) {
    return RESP.encode.error("ERR wrong number of arguments for 'KEYS' command");
  }

  const pattern = args[0];

  if (pattern === '*') {
    const allKeys = store.keys();
    return RESP.encode.array(allKeys);
  }
  return RESP.encode.error("ERR pattern doesn't match");
}