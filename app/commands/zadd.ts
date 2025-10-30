import { RESP } from "../resp";
import { sortedSetStore } from "../stores/set";

export function zaddCommand(args: string[]): string {
  if (args.length < 3) {
    return RESP.encode.error("ERR wrong number of arguments for 'ZADD' command");
  }

  const key = args[0];
  const score = parseFloat(args[1]);
  const member = args[2];

  if (isNaN(score)) {
    return RESP.encode.error("ERR value is not a valid float");
  }

  const added = sortedSetStore.add(key, member, score);
  return RESP.encode.integer(added);
}