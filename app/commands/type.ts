import { RESP } from "../resp";
import { store } from "../stores/store";
import { streamStore } from "../stores/stream";

export function typeCommand(args: string[]): string {
  if (args.length !== 1) {
    return RESP.encode.error("ERR wrong number of arguments for 'TYPE' command");
  }

  const key = args[0];

  // check in stream store
  if (streamStore.has(key)) {
    return RESP.encode.simpleString("stream");
  }

  // check in list store
  const type = store.type(key);
  if (type === null) {
    return RESP.encode.simpleString("none");
  }

  return RESP.encode.simpleString(type);
}