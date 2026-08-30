import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { dayOf, getRide, money, timeOf } from "@/lib/rides";
import { quoteBooking } from "@/lib/fees";
import { RideCheckout } from "@/components/RideCheckout";
import highway from "@/assets/highway-merge.jpg";

export const Route = createFileRoute("/rides/$rideId")({
  head: () => ({
    meta: [
      { title: "Ride details — Crossline Carpool" },
      {
        name: "description",
        content: "Review the route, stops, driver and fare, then reserve your seat and pay in app.",
      },
      { property: "og:title", content: "Ride details — Crossline Carpool" },
      { property: "og:description", content: "Review the route and reserve your carpool seat." },
    ],
  }),
  component: RideDetail,
});

function RideDetail() {
  const { rideId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [seats, setSeats] = useState(1);
  const [checkingOut, setCheckingOut] = useState(false);

  const { data: ride, isLoading } = useQuery({
    queryKey: ["ride", rideId],
    queryFn: () => getRide(rideId),
  });

  if (isLoading) {
    return <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16 text-muted-foreground">Loading ride…</div>;
  }

  if (!ride) {
    return (
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16">
        <h1 className="font-display font-semibold text-2xl">Ride not found</h1>
        <Link to="/rides" className="text-primary-deep text-sm mt-3 inline-block">
          Back to search
        </Link>
      </div>
    );
  }

  const price = Number(ride.price_per_seat);
  const quote = quoteBooking(price, seats);
  const isOwnRide = user?.id === ride.driver_id;

  function startCheckout() {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    setCheckingOut(true);
  }

  const stops = [
    { label: `${timeOf(ride.depart_at)} — ${ride.origin}`, tone: "start" as const },
    ...ride.stops.map((s) => ({ label: s, tone: "mid" as const })),
    {
      label: `${ride.arrive_at ? `${timeOf(ride.arrive_at)} — ` : ""}${ride.destination}`,
      tone: "end" as const,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8 pt-10 pb-16">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 rounded-[22px] ring-1 ring-black/5 bg-card overflow-hidden">
          <img
            src={highway}
            alt="Golden hour view of a Canadian highway merging into one lane"
            width={1440}
            height={760}
            className="w-full aspect-[16/8] object-cover"
          />
          <div className="p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-deep">Ride detail</p>
                <h1 className="font-display font-semibold text-foreground text-2xl mt-1.5">
                  {ride.origin} → {ride.destination}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {ride.driver?.full_name ?? "Driver"} · {ride.driver?.rating?.toFixed(1) ?? "5.0"}
                  {ride.car ? ` · ${ride.car}` : ""} · departs {dayOf(ride.depart_at)} {timeOf(ride.depart_at)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display font-semibold text-foreground text-3xl leading-none">{money(price)}</p>
                <p className="text-xs text-muted-foreground mt-1">per seat</p>
              </div>
            </div>

            <div className="mt-7 mb-1 h-16 grid place-items-center">
              <div className="w-full">
                <div className="flex items-center">
                  <div className="flex-1 h-px bg-primary" />
                  <div className="flex-1 h-px mx-3 -rotate-6 bg-primary/50" />
                  <div className="flex-1 h-px bg-foreground" />
                </div>
                <p className="text-center text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground mt-3">
                  Two lanes, one ride
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {stops.map((s, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span
                    className={`size-2.5 rounded-full shrink-0 ${
                      s.tone === "start" ? "bg-primary" : s.tone === "end" ? "bg-foreground" : "bg-foreground/40"
                    }`}
                  />
                  <span className={s.tone === "mid" ? "text-muted-foreground" : "text-foreground font-medium"}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            {ride.notes && <p className="mt-6 text-sm text-muted-foreground">{ride.notes}</p>}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-[22px] ring-1 ring-black/5 bg-card p-5 sm:p-7 h-fit">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-deep">Book &amp; pay</p>
          <h2 className="font-display font-semibold text-foreground text-2xl mt-1.5">Reserve your seat</h2>
          <p className="text-sm text-muted-foreground mt-2">
            {ride.seats_available} of {ride.seats_total} seats still open.
          </p>

          <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mt-5 mb-1.5">
            Seats
          </label>
          <input
            type="number"
            min={1}
            max={Math.max(1, ride.seats_available)}
            value={seats}
            disabled={checkingOut}
            onChange={(e) => setSeats(Math.max(1, Number(e.target.value) || 1))}
            className="w-full rounded-[12px] bg-background ring-1 ring-black/5 px-3.5 py-2.5 text-sm outline-none focus:ring-primary disabled:opacity-60"
          />

          <div className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {seats} × {money(price)}
              </span>
              <span className="text-foreground">{money(quote.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service fee</span>
              <span className="text-foreground">{money(quote.serviceFee)}</span>
            </div>
            <div className="flex justify-between border-t border-line pt-2">
              <span className="font-medium text-foreground">Total</span>
              <span className="font-display font-semibold text-foreground">{money(quote.total)}</span>
            </div>
          </div>

          {checkingOut ? (
            <RideCheckout
              rideId={ride.id}
              seats={seats}
              returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
            />
          ) : (
            <button
              onClick={startCheckout}
              disabled={ride.seats_available < 1 || isOwnRide}
              className="mt-5 w-full rounded-[12px] bg-primary hover:bg-primary-deep text-primary-foreground text-sm font-semibold py-3 disabled:opacity-60"
            >
              {isOwnRide
                ? "This is your ride"
                : ride.seats_available < 1
                  ? "Fully booked"
                  : `Book ${seats} seat${seats === 1 ? "" : "s"} · ${money(quote.total)}`}
            </button>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Free cancellation up to 24h before departure · fares in CAD. Your card is charged
            securely at checkout; the driver is paid out the fare and Crossline keeps the service
            fee.
          </p>
        </div>
      </div>
    </div>
  );
}
