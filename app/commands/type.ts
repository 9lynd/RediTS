import { RESP } from "../resp";
import { store } from "../store";

export function typeCommand(args: string[]): string {
  if (args.length !== 1) {
    return RESP.encode.error("ERR wrong number of arguments for 'TYPE' command");
  }

  const key = args[0];
  const type = store.type(key);

  if (type === null) {
    return RESP.encode.simpleString("none");
  }

  return RESP.encode.simpleString(type);
}