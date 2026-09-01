import type { RideWithDriver } from "@/lib/rides";

export type LatLng = { lat: number; lng: number };

/** Great-circle distance in km. */
export function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Decode a Google encoded polyline into coordinates. */
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    for (const which of ["lat", "lng"] as const) {
      let result = 0;
      let shift = 0;
      let byte: number;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (which === "lat") lat += delta;
      else lng += delta;
    }
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

/** Straight-line distance from a point to the closest sampled point on the ride's path. */
export function distanceToRouteKm(ride: RideWithDriver, point: LatLng): number | null {
  const path: LatLng[] = [];
  if (ride.route_polyline) {
    const decoded = decodePolyline(ride.route_polyline);
    // Sample the path so long routes stay cheap to score.
    const step = Math.max(1, Math.floor(decoded.length / 300));
    for (let i = 0; i < decoded.length; i += step) path.push(decoded[i]!);
  }
  if (ride.origin_lat != null && ride.origin_lng != null) {
    path.push({ lat: ride.origin_lat, lng: ride.origin_lng });
  }
  if (ride.destination_lat != null && ride.destination_lng != null) {
    path.push({ lat: ride.destination_lat, lng: ride.destination_lng });
  }
  if (path.length === 0) return null;
  return path.reduce<number>((best, p) => Math.min(best, haversineKm(p, point)), Infinity);
}

export type RideMatch = {
  ride: RideWithDriver;
  pickupKm: number | null;
  dropoffKm: number | null;
  score: number;
};

/**
 * Foundation for route-based matching: how far the rider is from the driver's path
 * at both ends. Real detour/ETA maths can replace the scoring later without
 * changing the surrounding UI.
 */
export function matchRides(
  rides: RideWithDriver[],
  riderOrigin: LatLng | null,
  riderDestination: LatLng | null,
  maxKm = 15,
): RideMatch[] {
  return rides
    .map((ride) => {
      const pickupKm = riderOrigin ? distanceToRouteKm(ride, riderOrigin) : null;
      const dropoffKm = riderDestination ? distanceToRouteKm(ride, riderDestination) : null;
      const parts = [pickupKm, dropoffKm].filter((v): v is number => v != null);
      const score = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0;
      return { ride, pickupKm, dropoffKm, score };
    })
    .filter((m) => {
      if (m.pickupKm != null && m.pickupKm > maxKm) return false;
      if (m.dropoffKm != null && m.dropoffKm > maxKm) return false;
      return true;
    })
    .sort((a, b) => a.score - b.score || +new Date(a.ride.depart_at) - +new Date(b.ride.depart_at));
}
