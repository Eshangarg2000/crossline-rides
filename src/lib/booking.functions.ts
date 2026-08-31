import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = (value: unknown) => {
  if (typeof value !== "string" || !/^[0-9a-fA-F-]{36}$/.test(value)) {
    throw new Error("Invalid id");
  }
  return value;
};

export const cancelMyBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { bookingId: string }) => ({ bookingId: uuid(data?.bookingId) }))
  .handler(async ({ data, context }) => {
    try {
      const { cancelBookingAsRider } = await import("@/lib/booking.server");
      const result = await cancelBookingAsRider(
        { supabase: context.supabase as never, userId: context.userId },
        data.bookingId,
      );
      return { ok: true as const, ...result };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : "Could not cancel this booking",
      };
    }
  });

export const cancelMyRide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { rideId: string; reason?: string }) => ({
    rideId: uuid(data?.rideId),
    reason: (data?.reason ?? "").slice(0, 500),
  }))
  .handler(async ({ data, context }) => {
    try {
      const { cancelRideAsDriver } = await import("@/lib/booking.server");
      const result = await cancelRideAsDriver(
        { supabase: context.supabase as never, userId: context.userId },
        data.rideId,
        data.reason,
      );
      return { ok: true as const, ...result };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : "Could not cancel this ride",
      };
    }
  });

/** Releases abandoned seat holds and closes out rides that have already run. */
export const runRideMaintenance = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.rpc("expire_stale_holds", { _ride_id: null });
  await supabaseAdmin.rpc("complete_due_rides");
  return { ok: true };
});
