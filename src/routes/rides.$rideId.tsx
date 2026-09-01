import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useState } from "react";
import { BadgeCheck, Circle, MapPin, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { formatPlace, dayOf, getRide, initials, money, timeOf } from "@/lib/rides";
import { quoteBooking } from "@/lib/fees";
import { RideCheckout } from "@/components/RideCheckout";
import { formatDistance, formatDuration } from "@/lib/maps";
import { getRideRoute } from "@/lib/ride-route.functions";
import { evaluateRide } from "@/lib/matching";
import { nearLabel, pickupLabel } from "@/components/RideRow";

const RouteMap = lazy(() => import("@/components/RouteMap"));

const num = (v: unknown) => (v === undefined || v === "" || Number.isNaN(Number(v)) ? undefined : Number(v));

type Search = {
  fromLat?: number | undefined;
  fromLng?: number | undefined;
  toLat?: number | undefined;
  toLng?: number | undefined;
};

export const Route = createFileRoute("/rides/$rideId")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    fromLat: num(search['fromLat']),
    fromLng: num(search['fromLng']),
    toLat: num(search['toLat']),
    toLng: num(search['toLng']),
  }),
  head: () => ({
    meta: [
      { title: "Your ride details — Crossline" },
      {
        name: "description",
        content:
          "Check your pickup, drop-off, driver, departure time and total price, then book your seat in the app.",
      },
      { property: "og:title", content: "Your ride details — Crossline" },
      {
        property: "og:description",
        content: "Pickup, drop-off, driver, timing and price — then book your seat.",
      },
    ],
  }),
  component: RideDetail,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-5 mt-5">
      <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function RideDetail() {
  const { rideId } = Route.useParams();
  const riderSearch = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [seats, setSeats] = useState(1);
  const [checkingOut, setCheckingOut] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const { data: ride, isLoading } = useQuery({
    queryKey: ["ride", rideId],
    queryFn: () => getRide(rideId),
  });

  const { data: route } = useQuery({
    queryKey: ["ride-route", rideId],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const result = await getRideRoute({ data: { rideId } });
      if ("error" in result) return null;
      return result;
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-5 sm:px-8 py-16 text-muted-foreground">
        Loading your ride…
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="mx-auto max-w-2xl px-5 sm:px-8 py-16">
        <h1 className="font-display font-semibold text-2xl">Ride not found</h1>
        <Link to="/rides" search={{}} className="text-primary-deep text-sm mt-3 inline-block">
          Back to search
        </Link>
      </div>
    );
  }

  const price = Number(ride.price_per_seat);
  const quote = quoteBooking(price, seats);
  const isOwnRide = user?.id === ride.driver_id;
  const isCancelled = ride.status === "cancelled";
  const hasDeparted = new Date(ride.depart_at).getTime() <= Date.now();
  const isBookable = ride.status === "published" && !hasDeparted;
  const name = ride.driver?.full_name ?? "Driver";
  const isProvider = ride.ride_kind === "commercial";

  // Read-only reuse of the validated matcher, purely to describe the rider's
  // own pickup and drop-off. Nothing here changes matching or booking.
  const riderOrigin =
    riderSearch.fromLat != null && riderSearch.fromLng != null
      ? { lat: riderSearch.fromLat, lng: riderSearch.fromLng }
      : null;
  const riderDestination =
    riderSearch.toLat != null && riderSearch.toLng != null
      ? { lat: riderSearch.toLat, lng: riderSearch.toLng }
      : null;
  const match =
    riderOrigin || riderDestination ? evaluateRide(ride, riderOrigin, riderDestination) : null;

  function startCheckout() {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    setCheckingOut(true);
  }

  const originPoint =
    route?.origin ??
    (ride.origin_lat != null && ride.origin_lng != null
      ? { lat: Number(ride.origin_lat), lng: Number(ride.origin_lng) }
      : null);
  const destinationPoint =
    route?.destination ??
    (ride.destination_lat != null && ride.destination_lng != null
      ? { lat: Number(ride.destination_lat), lng: Number(ride.destination_lng) }
      : null);
  const polyline = route?.polyline ?? ride.route_polyline ?? null;
  const hasMap = Boolean(polyline || originPoint || destinationPoint);
  const distanceKm = route?.distanceKm ?? (ride.distance_km != null ? Number(ride.distance_km) : null);
  const distanceLabel = formatDistance(distanceKm);
  const durationLabel = formatDuration(route?.durationMin ?? ride.duration_min ?? null);

  const bookLabel = isCancelled
    ? "This ride was cancelled"
    : hasDeparted
      ? "This ride has already departed"
      : isOwnRide
        ? "This is your ride"
        : ride.seats_available < 1
          ? "Fully booked"
          : `Book ${seats} seat${seats === 1 ? "" : "s"} · ${money(quote.total)}`;

  return (
    <div className="mx-auto max-w-2xl px-5 sm:px-8 pt-6 pb-32 lg:pb-16">
      {/* Driver / provider */}
      <div className="flex items-center gap-3">
        {ride.driver?.avatar_url ? (
          <img
            src={ride.driver.avatar_url}
            alt=""
            width={52}
            height={52}
            className="size-13 sm:size-14 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="size-14 rounded-full bg-sun grid place-items-center font-semibold text-foreground shrink-0">
            {initials(name)}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display font-semibold text-foreground text-xl">{name}</h1>
            <span className="inline-flex items-center gap-1 text-xs text-primary-deep font-medium">
              <BadgeCheck className="size-3.5" /> Verified
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
            <Star className="size-3.5" /> {ride.driver?.rating?.toFixed(1) ?? "5.0"}
            {ride.driver?.trips_count ? ` · ${ride.driver.trips_count} trips completed` : ""}
            <span className="text-[11px] font-medium rounded-full bg-background ring-1 ring-line px-2 py-0.5">
              {isProvider ? "Transportation provider" : "Personal ride"}
            </span>
          </p>
        </div>
      </div>
      {!isProvider && (
        <p className="mt-2 text-sm text-muted-foreground">
          This driver is already travelling this route.
        </p>
      )}

      {/* Trip */}
      <Section title="Trip">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Circle className="mt-1 size-3 text-primary shrink-0" strokeWidth={3} />
            <div>
              <p className="text-[15px] font-medium text-foreground">{formatPlace(ride.origin)}</p>
              <p className="text-sm text-muted-foreground">
                Leaves {timeOf(ride.depart_at)} · {dayOf(ride.depart_at)}
              </p>
            </div>
          </div>
          {ride.stops.map((s) => (
            <div key={s} className="flex items-start gap-3">
              <span className="mt-1.5 size-2 rounded-full bg-foreground/30 ml-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">{formatPlace(s)}</p>
            </div>
          ))}
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 size-4 text-foreground shrink-0" />
            <div>
              <p className="text-[15px] font-medium text-foreground">
                {formatPlace(ride.destination)}
              </p>
              <p className="text-sm text-muted-foreground">
                {ride.arrive_at ? `Estimated arrival ${timeOf(ride.arrive_at)}` : "Arrival time not set"}
              </p>
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {[
            distanceLabel,
            durationLabel && `${durationLabel} drive`,
            `${ride.seats_available} of ${ride.seats_total} seats available`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </Section>

      {/* Pickup */}
      <Section title="Your pickup">
        <p className="text-[15px] font-medium text-foreground">
          {match?.pickupKm != null
            ? `${nearLabel(match.pickupKm)} from your pickup location`
            : "Along the driver's route"}
        </p>
        <p className="text-sm text-muted-foreground mt-1">{pickupLabel(ride)}</p>
      </Section>

      {/* Drop-off */}
      <Section title="Your drop-off">
        <p className="text-[15px] font-medium text-foreground">
          {match?.dropoffKm != null
            ? `${nearLabel(match.dropoffKm)} from your destination`
            : `Drop-off at ${formatPlace(ride.destination)}`}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Confirm the exact spot with your driver after booking.
        </p>
      </Section>

      {/* Map — secondary */}
      {hasMap && (
        <Section title="Route">
          <button
            type="button"
            onClick={() => setMapOpen(true)}
            className="block w-full overflow-hidden rounded-[16px] ring-1 ring-black/5 text-left"
          >
            <ClientOnly fallback={<div className="w-full aspect-[16/9] bg-background" />}>
              <Suspense fallback={<div className="w-full aspect-[16/9] bg-background" />}>
                <RouteMap
                  polyline={polyline}
                  origin={originPoint}
                  destination={destinationPoint}
                  className="w-full aspect-[16/9]"
                />
              </Suspense>
            </ClientOnly>
          </button>
        </Section>
      )}

      {ride.notes && (
        <Section title="From the driver">
          <p className="text-sm text-muted-foreground">{ride.notes}</p>
        </Section>
      )}

      {/* Price */}
      <Section title="Price">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {seats} seat{seats === 1 ? "" : "s"} × {money(price)}
            </span>
            <span className="text-foreground">{money(quote.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Service fee</span>
            <span className="text-foreground">{money(quote.serviceFee)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax on service fee</span>
            <span className="text-foreground">Calculated at checkout</span>
          </div>
          <div className="flex justify-between border-t border-line pt-2">
            <span className="font-medium text-foreground">Total before tax</span>
            <span className="font-display font-semibold text-foreground">{money(quote.total)}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <label htmlFor="booking-seats" className="text-sm font-medium text-foreground">
            Seats
          </label>
          <input
            id="booking-seats"
            type="number"
            min={1}
            max={Math.max(1, ride.seats_available)}
            value={seats}
            disabled={checkingOut}
            onChange={(e) =>
              setSeats(
                Math.max(1, Math.min(Math.max(1, ride.seats_available), Number(e.target.value) || 1)),
              )
            }
            className="w-20 rounded-[12px] bg-background ring-1 ring-line px-3 py-2 text-[16px] text-foreground"
          />
        </div>

        {isOwnRide && isBookable && (
          <Link
            to="/rides/$rideId/edit"
            params={{ rideId: ride.id }}
            className="mt-4 inline-block rounded-[12px] bg-background ring-1 ring-line px-4 py-2 text-sm font-semibold text-foreground"
          >
            Edit ride
          </Link>
        )}

        {checkingOut ? (
          <div className="mt-5">
            <RideCheckout
              rideId={ride.id}
              seats={seats}
              returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
            />
          </div>
        ) : (
          <button
            onClick={startCheckout}
            disabled={!isBookable || ride.seats_available < 1 || isOwnRide}
            className="mt-5 hidden lg:block w-full rounded-[14px] bg-primary hover:bg-primary-deep text-primary-foreground text-[15px] font-semibold py-3.5 disabled:opacity-60"
          >
            {bookLabel}
          </button>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          Your seat is held for 30 minutes while you pay, and released automatically if checkout
          isn&apos;t completed. Full refund up to 24h before departure, seat fare only within 24h, and
          no refund inside 2h. GST, HST or PST applies to the Crossline service fee based on your
          province; the driver&apos;s cost-sharing fare is not taxed.
        </p>
      </Section>

      {/* Sticky mobile booking action */}
      {!checkingOut && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 backdrop-blur px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-2xl flex items-center gap-3">
            <div className="shrink-0">
              <p className="font-display font-semibold text-foreground text-lg leading-none">
                {money(quote.total)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {seats} seat{seats === 1 ? "" : "s"} before tax
              </p>
            </div>
            <button
              onClick={startCheckout}
              disabled={!isBookable || ride.seats_available < 1 || isOwnRide}
              className="flex-1 rounded-[14px] bg-primary hover:bg-primary-deep text-primary-foreground text-[15px] font-semibold py-3.5 disabled:opacity-60"
            >
              {isBookable && !isOwnRide && ride.seats_available > 0 ? "Book seat" : bookLabel}
            </button>
          </div>
        </div>
      )}

      {mapOpen && hasMap && (
        <div
          className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm grid place-items-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Ride route map"
          onClick={() => setMapOpen(false)}
        >
          <div
            className="w-full max-w-4xl overflow-hidden rounded-[22px] bg-card ring-1 ring-black/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="font-display font-semibold text-foreground">
                  {formatPlace(ride.origin)} → {formatPlace(ride.destination)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {[distanceLabel, durationLabel && `${durationLabel} drive`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMapOpen(false)}
                className="rounded-full bg-background ring-1 ring-line px-3.5 py-1.5 text-xs font-semibold text-foreground"
              >
                Close
              </button>
            </div>
            <ClientOnly fallback={<div className="w-full aspect-[4/3] sm:aspect-[16/9] bg-background" />}>
              <Suspense fallback={<div className="w-full aspect-[4/3] sm:aspect-[16/9] bg-background" />}>
                <RouteMap
                  polyline={polyline}
                  origin={originPoint}
                  destination={destinationPoint}
                  className="w-full aspect-[4/3] sm:aspect-[16/9]"
                />
              </Suspense>
            </ClientOnly>
          </div>
        </div>
      )}
    </div>
  );
}
