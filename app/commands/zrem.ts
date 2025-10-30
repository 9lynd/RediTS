import { RESP } from "../resp";
import { sortedSetStore } from "../stores/set";

export function zremCommand(args: string[]): string {
  if (args.length < 2) {
    return RESP.encode.error("ERR wrong number of arguments for 'zrem' command");
  }

  const key = args[0];
  const member = args[1];

  const removed = sortedSetStore.remove(key, member);
  return RESP.encode.integer(removed);
}