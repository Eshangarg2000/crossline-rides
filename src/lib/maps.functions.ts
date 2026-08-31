import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeDrivingRoute, type RouteInput } from "./maps.server";

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
