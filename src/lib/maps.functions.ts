import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeDrivingRoute, reverseGeocodePoint, type RouteInput } from "./maps.server";

export const computeRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: RouteInput) => {
    if (!input?.origin?.trim() || !input?.destination?.trim()) {
      throw new Error("Pick up and drop off are required");
    }
    return {
      origin: input.origin.trim().slice(0, 300),
      destination: input.destination.trim().slice(0, 300),
      stops: (input.stops ?? []).slice(0, 5).map((s) => s.trim().slice(0, 300)).filter(Boolean),
    } satisfies RouteInput;
  })
  .handler(async ({ data }) => computeDrivingRoute(data));

/** Reverse geocode the rider's device location. Auth-gated like every other
    Maps call so the gateway is never a public proxy. */
export const reverseGeocode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { lat: number; lng: number }) => {
    const lat = Number(input?.lat);
    const lng = Number(input?.lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error("Invalid location");
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) throw new Error("Invalid location");
    return { lat, lng };
  })
  .handler(async ({ data }) => reverseGeocodePoint(data.lat, data.lng));
