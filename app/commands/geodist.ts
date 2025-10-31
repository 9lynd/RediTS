import { RESP } from "../resp";
import { sortedSetStore } from "../stores/set";
import { geohashDecodeWGS84, geohashGetDistance } from "../utils/geo";

export function geodistCommand(args: string[]): string {
  if (args.length < 3) {
    return RESP.encode.error("ERR wrong number of arguments for 'GEODIST' command");
  }

  const key = args[0];
  const member1 = args[1];
  const member2 = args[2];
  const unit = args[3]?.toLowerCase() || 'm';

  const score1 = sortedSetStore.getScore(key, member1);
  const score2 = sortedSetStore.getScore(key, member2);

  if (score1 === null || score2 === null) {
    return RESP.encode.null();
  }

  const pos1 = geohashDecodeWGS84(score1);
  const pos2 = geohashDecodeWGS84(score2);

  let distance = geohashGetDistance(pos1.longitude, pos1.latitude, pos2.longitude, pos2.latitude);

  // Convert to requested unit
  switch (unit) {
    case 'km':
      distance /= 1000;
      break;
    case 'mi':
      distance /= 1609.34;
      break;
    case 'ft':
      distance /= 0.3048;
      break;
    // 'm' is default
  }

  return RESP.encode.bulkString(distance.toFixed(4));
}