const D_R = Math.PI / 180.0;
const R_MAJOR = 6378137.0;
const R_MINOR = 6356752.3142;
const RATIO = R_MINOR / R_MAJOR;
const ECCENT = Math.sqrt(1.0 - (RATIO * RATIO));
const COM = 0.5 * ECCENT;
const EARTH_RADIUS_IN_METERS = 6372797.560856;

const GEO_STEP_MAX = 26;
const GEO_LAT_MIN = -85.05112878;
const GEO_LAT_MAX = 85.05112878;
const GEO_LONG_MIN = -180;
const GEO_LONG_MAX = 180;

function deg_rad(ang: number): number {
  return ang * D_R;
}

function rad_deg(ang: number): number {
  return ang / D_R;
}

export function geohashEncodeWGS84(latitude: number, longitude: number): bigint {
  return geohashEncode(GEO_LAT_MIN, GEO_LAT_MAX, latitude, GEO_LONG_MIN, GEO_LONG_MAX, longitude, GEO_STEP_MAX);
}

export function geohashDecodeWGS84(hash: bigint): { latitude: number; longitude: number } {
  return geohashDecode(GEO_LAT_MIN, GEO_LAT_MAX, GEO_LONG_MIN, GEO_LONG_MAX, hash, GEO_STEP_MAX);
}

function geohashEncode(
  lat_min: number,
  lat_max: number,
  latitude: number,
  long_min: number,
  long_max: number,
  longitude: number,
  step: number
): bigint {
  let hash = 0n;
  let lat_range = [lat_min, lat_max];
  let long_range = [long_min, long_max];

  for (let i = 0; i < step; i++) {
    const lat_mid = (lat_range[0] + lat_range[1]) / 2;
    const long_mid = (long_range[0] + long_range[1]) / 2;

    const bit_pos = BigInt((step - i - 1) * 2);

    if (longitude >= long_mid) {
      hash |= 1n << (bit_pos + 1n);
      long_range[0] = long_mid;
    } else {
      long_range[1] = long_mid;
    }

    if (latitude >= lat_mid) {
      hash |= 1n << bit_pos;
      lat_range[0] = lat_mid;
    } else {
      lat_range[1] = lat_mid;
    }
  }

  return hash;
}

function geohashDecode(
  lat_min: number,
  lat_max: number,
  long_min: number,
  long_max: number,
  hash: bigint,
  step: number
): { latitude: number; longitude: number } {
  let lat_range = [lat_min, lat_max];
  let long_range = [long_min, long_max];

  for (let i = 0; i < step; i++) {
    const lat_mid = (lat_range[0] + lat_range[1]) / 2;
    const long_mid = (long_range[0] + long_range[1]) / 2;

    const bit_pos = BigInt((step - i - 1) * 2);

    // Decode in same (lon-first) order
    if (hash & (1n << (bit_pos + 1n))) {
      long_range[0] = long_mid;
    } else {
      long_range[1] = long_mid;
    }

    if (hash & (1n << bit_pos)) {
      lat_range[0] = lat_mid;
    } else {
      lat_range[1] = lat_mid;
    }
  }

  return {
    latitude: (lat_range[0] + lat_range[1]) / 2,
    longitude: (long_range[0] + long_range[1]) / 2,
  };
}

export function geohashGetDistance(lon1: number, lat1: number, lon2: number, lat2: number): number {
  lat1 = deg_rad(lat1);
  lon1 = deg_rad(lon1);
  lat2 = deg_rad(lat2);
  lon2 = deg_rad(lon2);

  const u = Math.sin((lat2 - lat1) / 2);
  const v = Math.sin((lon2 - lon1) / 2);

  return 2.0 * EARTH_RADIUS_IN_METERS * Math.asin(Math.sqrt(u * u + Math.cos(lat1) * Math.cos(lat2) * v * v));
}

export function validateCoordinates(longitude: number, latitude: number): boolean {
  return (
    longitude >= GEO_LONG_MIN &&
    longitude <= GEO_LONG_MAX &&
    latitude >= GEO_LAT_MIN &&
    latitude <= GEO_LAT_MAX
  );
}