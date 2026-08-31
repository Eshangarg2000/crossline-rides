import type { SupabaseClient } from "@supabase/supabase-js";
import { createStripeClient, type StripeEnv } from "@/lib/stripe.server";
import { quoteBooking } from "@/lib/fees";

type Ctx = {
  supabase: SupabaseClient<any, any, any>;
  userId: string;
};

export async function startRideCheckout(
  ctx: Ctx,
  input: { rideId: string; seats: number; returnUrl: string; environment: StripeEnv },
): Promise<{ clientSecret: string }> {
  const { supabase, userId } = ctx;

  const { data: ride, error: rideError } = await supabase
    .from("rides")
    .select("id, driver_id, origin, destination, depart_at, price_per_seat, seats_available, status")
    .eq("id", input.rideId)
    .maybeSingle();

  if (rideError) throw new Error(rideError.message);
  if (!ride) throw new Error("Ride not found");
  if (ride.status !== "published") throw new Error("This ride is no longer open for booking");
  if (ride.driver_id === userId) throw new Error("You cannot book your own ride");
  if (ride.seats_available < input.seats) throw new Error("Not enough seats left on this ride");

  const quote = quoteBooking(Number(ride.price_per_seat), input.seats);

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      ride_id: ride.id,
      rider_id: userId,
      seats: input.seats,
      total_amount: quote.total,
      service_fee: quote.serviceFee,
      driver_payout: quote.driverPayout,
      payment_status: "pending",
      status: "pending",
      payment_environment: input.environment,
    })
    .select("id")
    .single();

  if (bookingError) throw new Error(bookingError.message);

  const stripe = createStripeClient(input.environment);

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

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    ui_mode: "embedded_page",
    return_url: input.returnUrl,
    customer: customerId,
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
        quantity: input.seats,
      },
      {
        price_data: {
          currency: "cad",
          // Crossline's marketplace service: a taxable electronic service.
          product_data: {
            name: "Crossline service fee",
            tax_code: "txcd_10103001",
          },
          unit_amount: Math.round(quote.serviceFee * 100),
          tax_behavior: "exclusive",
        },
        quantity: 1,
      },
    ],
    payment_intent_data: { description: `Crossline carpool · ${label}` },
    metadata: {
      userId,
      bookingId: booking.id,
      rideId: ride.id,
      seats: String(input.seats),
      serviceFee: String(quote.serviceFee),
      driverPayout: String(quote.driverPayout),
      managed_payments: "false",
    },
  });


  await supabase
    .from("bookings")
    .update({ stripe_session_id: session.id })
    .eq("id", booking.id);

  return { clientSecret: session.client_secret ?? "" };
}
