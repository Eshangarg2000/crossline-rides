import type { Ride, RideWithDriver } from "@/lib/rides";

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

/* ------------------------------------------------------------------ */
/* Geometry quality                                                    */
/* ------------------------------------------------------------------ */

export type GeometryQuality =
  /** Decoded driving path with endpoints, distance and duration: usable for proximity matching. */
  | "route"
  /** Only origin/destination coordinates: a straight line, not a real path. Not matchable. */
  | "endpoints"
  /** Nothing usable. */
  | "none";

const MIN_PATH_POINTS = 8;
const MAX_SAMPLES = 400;

export function geometryQuality(ride: Ride): GeometryQuality {
  const hasEnds =
    ride.origin_lat != null &&
    ride.origin_lng != null &&
    ride.destination_lat != null &&
    ride.destination_lng != null;
  const decoded = ride.route_polyline ? decodePolyline(ride.route_polyline) : [];
  const hasDistance = ride.distance_km != null && Number(ride.distance_km) > 0;
  const hasDuration = ride.duration_min != null && Number(ride.duration_min) > 0;
  if (decoded.length >= MIN_PATH_POINTS && hasEnds && hasDistance && hasDuration) return "route";
  if (hasEnds) return "endpoints";
  return "none";
}

/** A ride is only eligible for route-intelligent matching with complete geometry. */
export function isRouteMatchable(ride: Ride) {
  return geometryQuality(ride) === "route";
}

/** Sampled driving path, ordered from origin to destination. */
export function ridePath(ride: Ride): LatLng[] {
  if (!ride.route_polyline) return [];
  const decoded = decodePolyline(ride.route_polyline);
  if (decoded.length === 0) return [];
  const step = Math.max(1, Math.floor(decoded.length / MAX_SAMPLES));
  const path: LatLng[] = [];
  for (let i = 0; i < decoded.length; i += step) path.push(decoded[i]!);
  const last = decoded[decoded.length - 1]!;
  if (path[path.length - 1] !== last) path.push(last);
  return path;
}

/** Closest sampled point on a path: distance in km plus its position along the path (0–1). */
export function nearestOnPath(path: LatLng[], point: LatLng) {
  let bestKm = Infinity;
  let bestIndex = 0;
  for (let i = 0; i < path.length; i++) {
    const km = haversineKm(path[i]!, point);
    if (km < bestKm) {
      bestKm = km;
      bestIndex = i;
    }
  }
  return { km: bestKm, position: path.length > 1 ? bestIndex / (path.length - 1) : 0 };
}

/** Legacy helper kept for callers that only need "how far from the driver's path". */
export function distanceToRouteKm(ride: Ride, point: LatLng): number | null {
  const path = ridePath(ride);
  if (path.length === 0) return null;
  return nearestOnPath(path, point).km;
}

/* ------------------------------------------------------------------ */
/* Tunable matching rules                                              */
/* ------------------------------------------------------------------ */

export type FlexibilityRule = {
  /** How far the rider's pickup may sit from the driver's path. */
  pickupKm: number;
  /** How far the rider's drop-off may sit from the driver's path. */
  dropoffKm: number;
  /** Whether the driver's stated max detour can widen the pickup allowance. */
  useDriverDetourAllowance: boolean;
};

/**
 * Thresholds per driver pickup flexibility. Tune these numbers without touching
 * the algorithm below.
 */
export const FLEXIBILITY_RULES: Record<string, FlexibilityRule> = {
  on_route: { pickupKm: 3, dropoffKm: 3, useDriverDetourAllowance: false },
  meeting_point: { pickupKm: 10, dropoffKm: 8, useDriverDetourAllowance: false },
  flexible: { pickupKm: 12, dropoffKm: 10, useDriverDetourAllowance: true },
};

export const DEFAULT_RULE: FlexibilityRule = FLEXIBILITY_RULES['on_route']!;

/** Hard ceiling so a generous driver preference can never match a different corridor. */
export const MAX_PICKUP_KM = 30;

/**
 * Rough off-route allowance implied by a driver's stated detour minutes.
 * A detour goes out and comes back, so the usable offset is about half the
 * detour distance. This is a geometric allowance only — it is NOT a
 * road-network detour calculation and is never shown to riders.
 */
const DETOUR_ROAD_SPEED_KMH = 50;
export function detourAllowanceKm(maxDetourMin: number | null | undefined) {
  const minutes = Math.max(0, Number(maxDetourMin ?? 0));
  return (minutes / 60) * DETOUR_ROAD_SPEED_KMH * 0.5;
}

export function ruleFor(ride: Ride): FlexibilityRule {
  const base = FLEXIBILITY_RULES[ride.pickup_flexibility ?? "on_route"] ?? DEFAULT_RULE;
  if (!base.useDriverDetourAllowance) return base;
  const widened = Math.max(base.pickupKm, detourAllowanceKm(ride.max_detour_min));
  return { ...base, pickupKm: Math.min(MAX_PICKUP_KM, widened) };
}

/* ------------------------------------------------------------------ */
/* Matching                                                            */
/* ------------------------------------------------------------------ */

export type RejectionReason =
  | "no_geometry"
  | "pickup_too_far"
  | "dropoff_too_far"
  | "wrong_direction";

export type RideMatch = {
  ride: RideWithDriver;
  /** Straight-line km from the rider's pickup to the driver's path. */
  pickupKm: number | null;
  /** Straight-line km from the rider's drop-off to the driver's path. */
  dropoffKm: number | null;
  /** Position along the driver's route, 0 = origin, 1 = destination. */
  pickupPosition: number | null;
  dropoffPosition: number | null;
  /** Share of the driver's route the rider would travel. */
  overlap: number | null;
  /**
   * Placeholder for a real road-network detour estimate. Always null today —
   * nothing in the UI may present a detour figure as calculated until this is
   * filled in by an actual routing call.
   */
  estimatedDetourMin: number | null;
  /** Internal ranking value, never shown to riders. Lower is better. */
  score: number;
  rejected: RejectionReason | null;
};

/** Minimum forward progress along the route between pickup and drop-off. */
const MIN_FORWARD_PROGRESS = 0.02;

export function evaluateRide(
  ride: RideWithDriver,
  riderOrigin: LatLng | null,
  riderDestination: LatLng | null,
): RideMatch {
  const base: RideMatch = {
    ride,
    pickupKm: null,
    dropoffKm: null,
    pickupPosition: null,
    dropoffPosition: null,
    overlap: null,
    estimatedDetourMin: null,
    score: Number.POSITIVE_INFINITY,
    rejected: null,
  };

  if (!isRouteMatchable(ride)) return { ...base, rejected: "no_geometry" };

  const path = ridePath(ride);
  if (path.length < MIN_PATH_POINTS) return { ...base, rejected: "no_geometry" };

  const rule = ruleFor(ride);
  const pickup = riderOrigin ? nearestOnPath(path, riderOrigin) : null;
  const dropoff = riderDestination ? nearestOnPath(path, riderDestination) : null;

  const result: RideMatch = {
    ...base,
    pickupKm: pickup?.km ?? null,
    dropoffKm: dropoff?.km ?? null,
    pickupPosition: pickup?.position ?? null,
    dropoffPosition: dropoff?.position ?? null,
  };

  if (pickup && pickup.km > rule.pickupKm) return { ...result, rejected: "pickup_too_far" };
  if (dropoff && dropoff.km > rule.dropoffKm) return { ...result, rejected: "dropoff_too_far" };

  // Direction + ordering: the rider's pickup must come before their drop-off
  // along the driver's actual path. This rejects reverse trips too.
  if (pickup && dropoff) {
    const progress = dropoff.position - pickup.position;
    if (progress < MIN_FORWARD_PROGRESS) return { ...result, rejected: "wrong_direction" };
    result.overlap = progress;
  }

  // Internal scoring, lower is better:
  //  - pickup convenience weighs most (the rider has to get there)
  //  - drop-off convenience next
  //  - route compatibility: a longer shared stretch is a better fit
  //  - departure time only breaks ties (handled in the sort)
  const pickupCost = (pickup?.km ?? 0) / Math.max(1, rule.pickupKm);
  const dropoffCost = (dropoff?.km ?? 0) / Math.max(1, rule.dropoffKm);
  const compatibility = result.overlap != null ? 1 - result.overlap : 0.5;
  result.score = pickupCost * 0.55 + dropoffCost * 0.3 + compatibility * 0.15;
  return result;
}

/** Route-intelligent matching. Only rides with complete geometry can qualify. */
export function matchRides(
  rides: RideWithDriver[],
  riderOrigin: LatLng | null,
  riderDestination: LatLng | null,
): RideMatch[] {
  return rides
    .map((ride) => evaluateRide(ride, riderOrigin, riderDestination))
    .filter((m) => m.rejected === null)
    .sort(
      (a, b) =>
        a.score - b.score || +new Date(a.ride.depart_at) - +new Date(b.ride.depart_at),
    );
}
