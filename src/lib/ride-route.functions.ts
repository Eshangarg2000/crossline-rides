import { createServerFn } from "@tanstack/react-start";
import type { RideRoute } from "./ride-route.server";

export const getRideRoute = createServerFn({ method: "GET" })
  .inputValidator((data: { rideId: string }) => {
    if (!/^[0-9a-fA-F-]{36}$/.test(data?.rideId ?? "")) throw new Error("Invalid ride");
    return { rideId: data.rideId };
  })
  .handler(async ({ data }): Promise<RideRoute | { error: string }> => {
    try {
      const { getRideRouteFor } = await import("./ride-route.server");
      return await getRideRouteFor(data.rideId);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Could not load the route" };
    }
  });
