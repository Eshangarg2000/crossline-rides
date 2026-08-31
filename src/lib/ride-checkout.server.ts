import type { SupabaseClient } from "@supabase/supabase-js";
import { createStripeClient, getServerStripeEnv } from "@/lib/stripe.server";

type Ctx = {
  supabase: SupabaseClient<any, any, any>;
  userId: string;
};

/** How long a seat stays held while the rider completes payment. */
const HOLD_MINUTES = 30;

export async function startRideCheckout(
  ctx: Ctx,
  input: { rideId: string; seats: number; returnUrl: string },
): Promise<{ clientSecret: string }> {
  const { supabase, userId } = ctx;
  const environment = getServerStripeEnv();

  const { data: ride, error: rideError } = await supabase
    .from("rides")
    .select("id, driver_id, origin, destination, depart_at, price_per_seat, status")
    .eq("id", input.rideId)
    .maybeSingle();

  if (rideError) throw new Error(rideError.message);
  if (!ride) throw new Error("Ride not found");

  // Seat availability, pricing, ownership and duplicate protection are all
  // enforced inside the database function — never from values sent by the client.
  const { data: booking, error: bookingError } = await supabase.rpc("create_booking_hold", {
    _ride_id: input.rideId,
    _seats: input.seats,
    _environment: environment,
    _hold_minutes: HOLD_MINUTES,
  });

  if (bookingError) throw new Error(bookingError.message);
  const held = booking as {
    id: string;
    seats: number;
    service_fee: number;
    driver_payout: number;
    stripe_session_id: string | null;
  };
  if (!held?.id) throw new Error("Could not start this booking");

  const stripe = createStripeClient(environment);

  // Idempotency: if this hold already has an open Stripe session, reuse it so a
  // double click or a refreshed checkout page does not create a second charge.
  if (held.stripe_session_id) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(held.stripe_session_id);
      if (existing.status === "open" && existing.client_secret) {
        return { clientSecret: existing.client_secret };
      }
    } catch {
      // Session no longer retrievable — fall through and create a new one.
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? undefined;

  let customerId: string | undefined;
  const found = await stripe.customers.search({
    query: `metadata['userId']:'${userId}'`,
    limit: 1,
  });
  if (found.data.length) {
    customerId = found.data[0]!.id;
  } else {
    const created = await stripe.customers.create({
      ...(email && { email }),
      metadata: { userId },
    });
    customerId = created.id;
  }

  const label = `${ride.origin} → ${ride.destination}`;

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: input.returnUrl,
      customer: customerId,
      expires_at: Math.floor(Date.now() / 1000) + HOLD_MINUTES * 60,
      // Stripe calculates GST/HST/PST from the rider's billing province.
      automatic_tax: { enabled: true },
      billing_address_collection: "required",
      customer_update: { address: "auto", name: "auto" },
      line_items: [
        {
          price_data: {
            currency: "cad",
            // Cost-sharing carpool fare paid to the driver: not a taxable
            // commercial supply, so it is classified as non-taxable.
            product_data: {
              name: `Carpool seat · ${label}`,
              tax_code: "txcd_00000000",
            },
            unit_amount: Math.round(Number(ride.price_per_seat) * 100),
            tax_behavior: "exclusive",
          },
          quantity: held.seats,
        },
        {
          price_data: {
            currency: "cad",
            // Crossline's marketplace service: a taxable electronic service.
            product_data: {
              name: "Crossline service fee",
              tax_code: "txcd_10103001",
            },
            unit_amount: Math.round(Number(held.service_fee) * 100),
            tax_behavior: "exclusive",
          },
          quantity: 1,
        },
      ],
      payment_intent_data: { description: `Crossline carpool · ${label}` },
      metadata: {
        userId,
        bookingId: held.id,
        rideId: ride.id,
        seats: String(held.seats),
        serviceFee: String(held.service_fee),
        driverPayout: String(held.driver_payout),
        managed_payments: "false",
      },
    },
    // Stripe-level idempotency for retried requests on the same hold.
    { idempotencyKey: `crossline-booking-${held.id}` },
  );

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("bookings")
    .update({ stripe_session_id: session.id })
    .eq("id", held.id);

  return { clientSecret: session.client_secret ?? "" };
}
