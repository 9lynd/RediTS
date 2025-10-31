import { RESP } from "../resp";
import { sortedSetStore } from "../stores/set";
import { geohashEncodeWGS84, validateCoordinates } from "../utils/geo";

export function geoaddCommand(args: string[]): string {
  if (args.length < 4) {
    return RESP.encode.error("ERR wrong number of arguments for 'GEOADD' command");
  }

  const key = args[0];
  const longitude = parseFloat(args[1]);
  const latitude = parseFloat(args[2]);
  const member = args[3];

  if (isNaN(longitude) || isNaN(latitude)) {
    return RESP.encode.error("ERR invalid longitude,latitude pair");
  }

  if (!validateCoordinates(longitude, latitude)) {
    return RESP.encode.error(
      `ERR invalid longitude,latitude pair ${longitude.toFixed(6)},${latitude.toFixed(6)}`
    );
  }

  const scoreBigInt = geohashEncodeWGS84(latitude, longitude);
  const score = Number(scoreBigInt);
  
  const added = sortedSetStore.add(key, member, score);
  return RESP.encode.integer(added);
}