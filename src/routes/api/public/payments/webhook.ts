import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { verifyWebhook, type StripeEnv } from "@/lib/stripe.server";

let _supabase: ReturnType<typeof createClient<any, any, any>> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient<any, any, any>(
      process.env['SUPABASE_URL']!,
      process.env['SUPABASE_SERVICE_ROLE_KEY']!,
    );
  }
  return _supabase;
}

/**
 * Records the Stripe event id. Returns false when the event was already
 * processed, so retried/duplicated deliveries become no-ops.
 */
async function claimEvent(id: string, type: string, env: StripeEnv): Promise<boolean> {
  if (!id) return true;
  const { error } = await getSupabase()
    .from("stripe_events")
    .insert({ id, type, environment: env });
  if (error) {
    if (error.code === "23505") return false; // already processed
    throw new Error(error.message);
  }
  return true;
}

async function markBookingPaid(session: any, env: StripeEnv) {
  const bookingId = session?.metadata?.bookingId;
  if (!bookingId) {
    console.error("Checkout session without bookingId metadata", session?.id);
    return;
  }
  const taxCents = session?.total_details?.amount_tax ?? null;
  const totalCents = session?.amount_total ?? null;
  const paymentIntent =
    typeof session?.payment_intent === "string"
      ? session.payment_intent
      : (session?.payment_intent?.id ?? null);

  const { error } = await getSupabase().rpc("confirm_booking_paid", {
    _booking_id: bookingId,
    _environment: env,
    _tax: taxCents === null ? null : taxCents / 100,
    _total: totalCents === null ? null : totalCents / 100,
    _payment_intent: paymentIntent,
  });
  if (error) throw new Error(error.message);
}

async function markBookingFailed(session: any, env: StripeEnv, status: "failed" | "expired") {
  const bookingId = session?.metadata?.bookingId;
  if (!bookingId) return;
  const { error } = await getSupabase().rpc("fail_booking", {
    _booking_id: bookingId,
    _environment: env,
    _payment_status: status,
    _reason:
      status === "expired"
        ? "Checkout expired before payment completed — your seat hold was released."
        : "Payment failed — your seat hold was released.",
  });
  if (error) throw new Error(error.message);
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = (await verifyWebhook(req, env)) as {
    id: string;
    type: string;
    data: { object: any };
  };

  const fresh = await claimEvent(event.id, event.type, env);
  if (!fresh) {
    console.log("Duplicate Stripe event ignored:", event.id);
    return;
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.payment_status !== "unpaid") await markBookingPaid(session, env);
      break;
    }
    case "checkout.session.async_payment_succeeded":
      await markBookingPaid(event.data.object, env);
      break;
    case "checkout.session.async_payment_failed":
      await markBookingFailed(event.data.object, env, "failed");
      break;
    case "checkout.session.expired":
      await markBookingFailed(event.data.object, env, "expired");
      break;
    default:
      console.log("Unhandled event:", event.type);
  }

  // Housekeeping: release any seat holds whose checkout was simply abandoned.
  await getSupabase().rpc("expire_stale_holds", { _ride_id: null });
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook received with invalid env query parameter:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
