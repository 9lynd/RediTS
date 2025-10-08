import { RESP } from "../resp";
import { store } from "../store";

export function getCommand(args: string[]): string{
  if (args.length !== 1) {
    return RESP.encode.error(`ERR -> wrong number of arguments for get: ${args.length} `);
  }

  const key = args[0];
  const value = store.get(key);

  if (value === null) {
    return RESP.encode.null();
  }

  return RESP.encode.bulkString(value);
}