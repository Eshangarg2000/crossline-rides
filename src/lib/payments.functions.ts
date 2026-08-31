import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getStripeErrorMessage } from "@/lib/stripe.server";

export const createRideCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { rideId: string; seats: number; returnUrl: string }) => {
    if (!/^[0-9a-fA-F-]{36}$/.test(data.rideId)) throw new Error("Invalid ride");
    if (!Number.isInteger(data.seats) || data.seats < 1 || data.seats > 8) {
      throw new Error("Invalid seat count");
    }
    return { rideId: data.rideId, seats: data.seats, returnUrl: data.returnUrl };
  })
  .handler(async ({ data, context }): Promise<{ clientSecret: string } | { error: string }> => {
    try {
      const { startRideCheckout } = await import("@/lib/ride-checkout.server");
      return await startRideCheckout(
        { supabase: context.supabase as never, userId: context.userId },
        data,
      );
    } catch (error) {
      return { error: error instanceof Error ? error.message : getStripeErrorMessage(error) };
    }
  });
