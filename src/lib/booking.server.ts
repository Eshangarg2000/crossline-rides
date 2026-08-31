import type { SupabaseClient } from "@supabase/supabase-js";
import { createStripeClient, getServerStripeEnv, type StripeEnv } from "@/lib/stripe.server";
import { quoteRefund } from "@/lib/cancellation";

type Ctx = { supabase: SupabaseClient<any, any, any>; userId: string };

type BookingRow = {
  id: string;
  ride_id: string;
  rider_id: string;
  seats: number;
  total_amount: number;
  service_fee: number;
  tax_amount: number;
  payment_status: string;
  status: string;
  payment_environment: StripeEnv;
  stripe_payment_intent_id: string | null;
};

async function refundIfNeeded(
  amount: number,
  booking: BookingRow,
): Promise<{ refunded: number; note?: string }> {
  if (amount <= 0 || booking.payment_status !== "paid") return { refunded: 0 };
  if (!booking.stripe_payment_intent_id) {
    return { refunded: 0, note: "No payment reference on file — refund must be issued manually." };
  }
  const stripe = createStripeClient(booking.payment_environment ?? getServerStripeEnv());
  await stripe.refunds.create(
    {
      payment_intent: booking.stripe_payment_intent_id,
      amount: Math.round(amount * 100),
    },
    { idempotencyKey: `crossline-refund-${booking.id}` },
  );
  return { refunded: amount };
}

export async function cancelBookingAsRider(ctx: Ctx, bookingId: string) {
  const { data: booking, error } = await ctx.supabase
    .from("bookings")
    .select(
      "id, ride_id, rider_id, seats, total_amount, service_fee, tax_amount, payment_status, status, payment_environment, stripe_payment_intent_id",
    )
    .eq("id", bookingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!booking) throw new Error("Booking not found");
  if (booking.rider_id !== ctx.userId) throw new Error("Not allowed to cancel this booking");

  const { data: ride } = await ctx.supabase
    .from("rides")
    .select("depart_at")
    .eq("id", booking.ride_id)
    .maybeSingle();

  const quote = quoteRefund({
    totalAmount: Number(booking.total_amount),
    serviceFee: Number(booking.service_fee),
    taxAmount: Number(booking.tax_amount ?? 0),
    departAt: ride?.depart_at ?? new Date().toISOString(),
    paid: booking.payment_status === "paid",
  });

  const { refunded, note } = await refundIfNeeded(quote.amount, booking as BookingRow);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error: cancelError } = await supabaseAdmin.rpc("cancel_booking_atomic", {
    _booking_id: bookingId,
    _actor: ctx.userId,
    _reason: quote.label,
    _refund: refunded,
    _by_driver: false,
  });
  if (cancelError) throw new Error(cancelError.message);

  return { refunded, message: note ? `${quote.label} ${note}` : quote.label };
}

export async function cancelRideAsDriver(ctx: Ctx, rideId: string, reason: string) {
  const { data: ride, error } = await ctx.supabase
    .from("rides")
    .select("id, driver_id, status")
    .eq("id", rideId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!ride) throw new Error("Ride not found");
  if (ride.driver_id !== ctx.userId) throw new Error("Not allowed to cancel this ride");
  if (ride.status === "cancelled") return { cancelledBookings: 0, refunded: 0 };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: bookings } = await supabaseAdmin
    .from("bookings")
    .select(
      "id, ride_id, rider_id, seats, total_amount, service_fee, tax_amount, payment_status, status, payment_environment, stripe_payment_intent_id",
    )
    .eq("ride_id", rideId)
    .in("status", ["pending_payment", "confirmed"]);

  let refundedTotal = 0;
  let cancelled = 0;

  for (const b of (bookings ?? []) as BookingRow[]) {
    // A driver cancellation is always a full refund to the rider.
    const amount = b.payment_status === "paid" ? Number(b.total_amount) : 0;
    const { refunded } = await refundIfNeeded(amount, b);
    refundedTotal += refunded;
    const { error: cErr } = await supabaseAdmin.rpc("cancel_booking_atomic", {
      _booking_id: b.id,
      _actor: ctx.userId,
      _reason: reason || "The driver cancelled this ride. You have been fully refunded.",
      _refund: refunded,
      _by_driver: true,
    });
    if (cErr) throw new Error(cErr.message);
    cancelled += 1;
  }

  const { error: rideErr } = await supabaseAdmin.rpc("cancel_ride_atomic", {
    _ride_id: rideId,
    _actor: ctx.userId,
    _reason: reason || null,
  });
  if (rideErr) throw new Error(rideErr.message);

  return { cancelledBookings: cancelled, refunded: refundedTotal };
}
