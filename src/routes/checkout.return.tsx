import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/checkout/return")({
  head: () => ({
    meta: [
      { title: "Booking confirmed — Crossline Carpool" },
      {
        name: "description",
        content: "Your carpool seat payment is complete. See your upcoming trip details on Crossline.",
      },
      { property: "og:title", content: "Booking confirmed — Crossline Carpool" },
      { property: "og:description", content: "Your carpool seat payment is complete." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { session_id?: string | undefined } => ({
    session_id: typeof search['session_id'] === "string" ? (search['session_id'] as string) : undefined,
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id: sessionId } = Route.useSearch();

  return (
    <div className="mx-auto max-w-2xl px-5 sm:px-8 py-20 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-deep">
        {sessionId ? "Payment received" : "Checkout"}
      </p>
      <h1 className="font-display font-semibold text-foreground text-3xl mt-2">
        {sessionId ? "Your seat is booked" : "No booking found"}
      </h1>
      <p className="text-sm text-muted-foreground mt-3">
        {sessionId
          ? "We've confirmed your fare. Your driver will see you on the pickup list — details are in My trips."
          : "We couldn't find a checkout session. If you were charged, check My trips before retrying."}
      </p>
      <div className="mt-7 flex justify-center gap-3">
        <Link
          to="/my-trips"
          className="rounded-[12px] bg-primary hover:bg-primary-deep text-primary-foreground text-sm font-semibold px-5 py-3"
        >
          Go to my trips
        </Link>
        <Link
          to="/rides"
          className="rounded-[12px] ring-1 ring-black/10 text-foreground text-sm font-semibold px-5 py-3"
        >
          Find another ride
        </Link>
      </div>
    </div>
  );
}
