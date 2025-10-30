import { RESP } from "../resp";
import { sortedSetStore } from "../stores/set";

export function zscoreCommand(args: string[]): string {
  if (args.length < 2) {
    return RESP.encode.error("ERR wrong number of arguments for 'zscore' command");
  }

  const key = args[0];
  const member = args[1];

  const score = sortedSetStore.getScore(key, member);
  if (score === null) {
    return RESP.encode.null();
  }

  return RESP.encode.bulkString(score.toString());
}