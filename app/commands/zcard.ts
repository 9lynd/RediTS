import { RESP } from "../resp";
import { sortedSetStore } from "../stores/set";

export function zcardCommand(args: string[]): string {
  if (args.length < 1) {
    return RESP.encode.error("ERR wrong number of arguments for 'zcard' command");
  }

  const key = args[0];
  const count = sortedSetStore.cardinality(key);
  return RESP.encode.integer(count);
}