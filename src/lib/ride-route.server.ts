import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { computeDrivingRoute } from "./maps.server";

export type RideRoute = {
  polyline: string | null;
  distanceKm: number | null;
  durationMin: number | null;
  origin: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  stops: string[];
};

function publicClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Backend is not configured");

  return createClient<Database>(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export async function getRideRouteFor(rideId: string): Promise<RideRoute> {
  const supabase = publicClient();

  const { data: ride, error } = await supabase
    .from("rides")
    .select(
      "id, origin, destination, stops, origin_place_id, destination_place_id, origin_lat, origin_lng, destination_lat, destination_lng, distance_km, duration_min, route_polyline",
    )
    .eq("id", rideId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!ride) throw new Error("Ride not found");

  const point = (lat: number | null, lng: number | null) =>
    lat != null && lng != null ? { lat: Number(lat), lng: Number(lng) } : null;

  if (ride.route_polyline) {
    return {
      polyline: ride.route_polyline,
      distanceKm: ride.distance_km != null ? Number(ride.distance_km) : null,
      durationMin: ride.duration_min ?? null,
      origin: point(ride.origin_lat, ride.origin_lng),
      destination: point(ride.destination_lat, ride.destination_lng),
      stops: ride.stops ?? [],
    };
  }

  // Older rides were posted before mapping existed: resolve the route now and cache it.
  const route = await computeDrivingRoute({
    origin: ride.origin_place_id ? `place_id:${ride.origin_place_id}` : ride.origin,
    destination: ride.destination_place_id
      ? `place_id:${ride.destination_place_id}`
      : ride.destination,
    stops: ride.stops ?? [],
  });

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("rides")
      .update({
        route_polyline: route.polyline,
        distance_km: route.distanceKm,
        duration_min: route.durationMin,
      })
      .eq("id", ride.id);
  } catch (cacheError) {
    console.error("Could not cache ride route", cacheError);
  }

  return {
    polyline: route.polyline,
    distanceKm: route.distanceKm,
    durationMin: route.durationMin,
    origin: point(ride.origin_lat, ride.origin_lng),
    destination: point(ride.destination_lat, ride.destination_lng),
    stops: ride.stops ?? [],
  };
}
