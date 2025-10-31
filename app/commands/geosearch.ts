import { RESP } from "../resp";
import { sortedSetStore } from "../stores/set";
import { geohashEncodeWGS84, geohashDecodeWGS84, geohashGetDistance } from "../utils/geo";

export function geosearchCommand(args: string[]): string {
  if (args.length < 6) {
    return RESP.encode.error("ERR wrong number of arguments for 'GEOSEARCH' command");
  }

  const key = args[0];
  
  // Parse FROMLONLAT
  if (args[1].toUpperCase() !== 'FROMLONLAT') {
    return RESP.encode.error("ERR only FROMLONLAT is supported");
  }

  const centerLongitude = parseFloat(args[2]);
  const centerLatitude = parseFloat(args[3]);

  if (isNaN(centerLongitude) || isNaN(centerLatitude)) {
    return RESP.encode.error("ERR invalid coordinates");
  }

  // Parse BYRADIUS
  if (args[4].toUpperCase() !== 'BYRADIUS') {
    return RESP.encode.error("ERR only BYRADIUS is supported");
  }

  let radius = parseFloat(args[5]);
  const unit = args[6]?.toLowerCase() || 'm';

  if (isNaN(radius)) {
    return RESP.encode.error("ERR invalid radius");
  }

  // Convert radius to meters
  switch (unit) {
    case 'km':
      radius *= 1000;
      break;
    case 'mi':
      radius *= 1609.34;
      break;
    case 'ft':
      radius *= 0.3048;
      break;
    // 'm' is default
  }

  // Get all members and check distance
  const allMembers = sortedSetStore.getRange(key, 0, -1);
  const matches: string[] = [];

  for (const member of allMembers) {
    const score = sortedSetStore.getScore(key, member);
    if (score === null) continue;

    const pos = geohashDecodeWGS84(BigInt(score));
    const distance = geohashGetDistance(centerLongitude, centerLatitude, pos.longitude, pos.latitude);

    if (distance <= radius) {
      matches.push(member);
    }
  }

  return RESP.encode.array(matches);
}