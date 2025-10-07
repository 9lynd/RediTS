import { RESP } from "../resp";
import { store } from "../store";

export function setCommand(args: string[]): string {

  if(args.length < 2) {
    return RESP.encode.error(`ERR: wrong number of arguments for set: ${args.length}`);
  }

  const key = args[0];
  const value = args[1];

  store.set(key, value);

  return RESP.encode.simpleString("OK");
}