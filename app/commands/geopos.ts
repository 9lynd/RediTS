import { RESP } from "../resp";
import { sortedSetStore } from "../stores/set";
import { geohashDecodeWGS84 } from "../utils/geo";

export function geoposCommand(args: string[]): string {
  if (args.length < 2) {
    return RESP.encode.error("ERR wrong number of arguments for 'GEOPOS' command");
  }

  const key = args[0];
  const members = args.slice(1);

  const results: string[] = [];

  for (const member of members) {
    const score = sortedSetStore.getScore(key, member);
    
    if (score === null) {
      results.push(RESP.encode.nullArray());
    } else {
      const { latitude, longitude } = geohashDecodeWGS84(BigInt(score));
      
      const posArray = RESP.encode.mixedArray([
        RESP.encode.bulkString(longitude.toString()),
        RESP.encode.bulkString(latitude.toString())
      ]);
      results.push(posArray);
    }
  }

  return RESP.encode.mixedArray(results);
}