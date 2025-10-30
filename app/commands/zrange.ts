import { RESP } from "../resp";
import { sortedSetStore } from "../stores/set";

export function zrangeCommand(args: string[]): string {
  if (args.length < 3) {
    return RESP.encode.error("ERR wrong number of arguments for 'ZRANGE' command");
  }

  const key = args[0];
  const start = parseInt(args[1]);
  const stop = parseInt(args[2]);

  if (isNaN(start) || isNaN(stop)) {
    return RESP.encode.error("ERR value is not an integer or out of range");
  }

  const members = sortedSetStore.getRange(key, start, stop);
  return RESP.encode.array(members);
}