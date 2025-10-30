import { RESP } from "../resp";
import { sortedSetStore } from "../stores/set";

export function zrankCommand(args: string[]): string {
  if (args.length < 2) {
    return RESP.encode.error("ERR wrong number of arguments for 'ZRANK' command");
  }

  const key = args[0];
  const member = args[1];

  const rank = sortedSetStore.getRank(key, member);
  if (rank === null) {
    return RESP.encode.null();
  }
  return RESP.encode.integer(rank);
}