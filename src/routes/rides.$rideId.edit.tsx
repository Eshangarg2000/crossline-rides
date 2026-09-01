import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PlaceInput } from "@/components/PlaceInput";
import { computeRoute } from "@/lib/maps.functions";
import { formatDistance, formatDuration, type PlacePick } from "@/lib/maps";
import { formatPlace, getRide } from "@/lib/rides";

export const Route = createFileRoute("/rides/$rideId/edit")({
  head: () => ({
    meta: [
      { title: "Edit your ride — Crossline Carpool" },
      {
        name: "description",
        content:
          "Update your published Crossline ride: departure time, seats, price, pickup flexibility and route details.",
      },
      { property: "og:title", content: "Edit your ride — Crossline Carpool" },
      {
        property: "og:description",
        content: "Update departure, seats, price and pickup flexibility on a published ride.",
      },
    ],
  }),
  component: EditRide,
});

type RouteInfo = { distanceKm: number; durationMin: number; polyline: string | null };

const ACTIVE_BOOKING_STATUSES = ["pending_payment", "confirmed"];

function EditRide() {
  const { rideId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const runComputeRoute = useServerFn(computeRoute);

  const { data: ride, isLoading } = useQuery({
    queryKey: ["ride", rideId],
    queryFn: () => getRide(rideId),
  });

  // Seats already sold or held: the driver may never drop below this.
  const { data: bookings } = useQuery({
    queryKey: ["ride-bookings", rideId],
    enabled: Boolean(user && ride && ride.driver_id === user.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("seats,status")
        .eq("ride_id", rideId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const seatsTaken = useMemo(
    () =>
      (bookings ?? [])
        .filter((b) => ACTIVE_BOOKING_STATUSES.includes(b.status))
        .reduce((sum, b) => sum + b.seats, 0),
    [bookings],
  );
  const hasActiveBookings = seatsTaken > 0;

  const [origin, setOrigin] = useState("");
  const [originPick, setOriginPick] = useState<PlacePick | null>(null);
  const [destination, setDestination] = useState("");
  const [destinationPick, setDestinationPick] = useState<PlacePick | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("08:00");
  const [arriveTime, setArriveTime] = useState("");
  const [seatsTotal, setSeatsTotal] = useState("3");
  const [price, setPrice] = useState("0");
  const [car, setCar] = useState("");
  const [notes, setNotes] = useState("");
  const [rideKind, setRideKind] = useState("cost_share");
  const [pickupFlexibility, setPickupFlexibility] = useState("on_route");
  const [maxDetour, setMaxDetour] = useState("10");
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routing, setRouting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!ride || hydrated) return;
    const depart = new Date(ride.depart_at);
    const pad = (n: number) => String(n).padStart(2, "0");
    setOrigin(ride.origin);
    setDestination(ride.destination);
    setDate(`${depart.getFullYear()}-${pad(depart.getMonth() + 1)}-${pad(depart.getDate())}`);
    setTime(`${pad(depart.getHours())}:${pad(depart.getMinutes())}`);
    if (ride.arrive_at) {
      const arrive = new Date(ride.arrive_at);
      setArriveTime(`${pad(arrive.getHours())}:${pad(arrive.getMinutes())}`);
    }
    setSeatsTotal(String(ride.seats_total));
    setPrice(String(ride.price_per_seat));
    setCar(ride.car ?? "");
    setNotes(ride.notes ?? "");
    setRideKind(ride.ride_kind ?? "cost_share");
    setPickupFlexibility(ride.pickup_flexibility ?? "on_route");
    setMaxDetour(String(ride.max_detour_min ?? 10));
    setHydrated(true);
  }, [ride, hydrated]);

  // Only recompute when the driver re-picks both addresses from the suggestions.
  useEffect(() => {
    if (!originPick || !destinationPick) {
      setRouteInfo(null);
      return;
    }
    let cancelled = false;
    setRouting(true);
    runComputeRoute({
      data: {
        origin: `place_id:${originPick.placeId}`,
        destination: `place_id:${destinationPick.placeId}`,
        stops: [],
      },
    })
      .then((result) => {
        if (!cancelled) setRouteInfo(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setRouteInfo(null);
          toast.error(err instanceof Error ? err.message : "Could not calculate the route");
        }
      })
      .finally(() => {
        if (!cancelled) setRouting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [originPick, destinationPick, runComputeRoute]);

  const field =
    "w-full rounded-[12px] bg-background ring-1 ring-black/5 px-3.5 py-2.5 text-sm text-foreground outline-none focus:ring-primary disabled:opacity-60";
  const label = "block text-sm font-medium text-foreground mb-1.5";

  if (isLoading || !hydrated) {
    return (
      <div className="mx-auto max-w-2xl px-5 sm:px-8 py-16 text-muted-foreground">Loading ride…</div>
    );
  }

  if (!ride) {
    return (
      <div className="mx-auto max-w-2xl px-5 sm:px-8 py-16">
        <h1 className="font-display font-semibold text-2xl">Ride not found</h1>
        <Link to="/rides" className="text-primary-deep text-sm mt-3 inline-block">
          Back to search
        </Link>
      </div>
    );
  }

  if (user && ride.driver_id !== user.id) {
    return (
      <div className="mx-auto max-w-2xl px-5 sm:px-8 py-16">
        <h1 className="font-display font-semibold text-2xl">You can't edit this ride</h1>
        <p className="text-sm text-muted-foreground mt-2">Only the driver who published it can.</p>
      </div>
    );
  }

  const hasDeparted = new Date(ride.depart_at).getTime() <= Date.now();
  const editable = ride.status === "published" && !hasDeparted;

  if (!editable) {
    return (
      <div className="mx-auto max-w-2xl px-5 sm:px-8 py-16">
        <h1 className="font-display font-semibold text-2xl">This ride can no longer be edited</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {ride.status === "published" ? "It has already departed." : `Status: ${ride.status}.`}
        </p>
        <Link to="/my-trips" className="text-primary-deep text-sm mt-3 inline-block">
          Back to my trips
        </Link>
      </div>
    );
  }

  const routeLocked = hasActiveBookings;
  const scheduleLocked = hasActiveBookings;
  const priceLocked = hasActiveBookings;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !ride) return;
    const seats = Number(seatsTotal) || 1;
    if (seats < seatsTaken) {
      toast.error(`You already have ${seatsTaken} seat${seatsTaken === 1 ? "" : "s"} booked.`);
      return;
    }
    const changingRoute = Boolean(originPick && destinationPick);
    if (changingRoute && (!routeInfo?.polyline || !routeInfo.distanceKm)) {
      toast.error("Wait for the new route to be measured before saving.");
      return;
    }

    setBusy(true);
    try {
      const update: Record<string, unknown> = {
        seats_total: seats,
        // Keep booked seats reserved; only the free pool changes.
        seats_available: Math.max(0, seats - seatsTaken),
        car: car || null,
        notes: notes || null,
        ride_kind: rideKind,
        pickup_flexibility: pickupFlexibility,
        max_detour_min: pickupFlexibility === "on_route" ? 0 : Number(maxDetour) || 0,
      };

      if (!priceLocked) update['price_per_seat'] = Number(price);

      if (!scheduleLocked) {
        update['depart_at'] = new Date(`${date}T${time}`).toISOString();
        update['arrive_at'] = arriveTime ? new Date(`${date}T${arriveTime}`).toISOString() : null;
      }

      if (!routeLocked && changingRoute) {
        update['origin'] = origin;
        update['destination'] = destination;
        update['origin_place_id'] = originPick!.placeId;
        update['destination_place_id'] = destinationPick!.placeId;
        update['origin_lat'] = originPick!.lat;
        update['origin_lng'] = originPick!.lng;
        update['destination_lat'] = destinationPick!.lat;
        update['destination_lng'] = destinationPick!.lng;
        update['distance_km'] = routeInfo!.distanceKm;
        update['duration_min'] = routeInfo!.durationMin;
        update['route_polyline'] = routeInfo!.polyline;
      }

      const { error } = await supabase.from("rides").update(update).eq("id", ride.id);
      if (error) throw error;
      toast.success("Ride updated");
      navigate({ to: "/rides/$rideId", params: { rideId: ride.id } });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update the ride";
      toast.error(
        /row-level security|policy/i.test(message)
          ? "Your driver verification must be current to edit a ride."
          : message,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 sm:px-8 pt-10 pb-16">
      <p className="text-sm font-medium text-primary-deep">Your ride</p>
      <h1 className="font-display font-semibold text-foreground text-3xl mt-2">Edit ride</h1>
      <p className="text-sm text-muted-foreground mt-2">
        {formatPlace(ride.origin)} → {formatPlace(ride.destination)}
      </p>

      {hasActiveBookings && (
        <div className="mt-5 rounded-[14px] bg-background ring-1 ring-line px-4 py-3 text-sm text-muted-foreground">
          {seatsTaken} seat{seatsTaken === 1 ? " is" : "s are"} booked or being paid for. Route,
          departure time and price are locked so existing bookings stay valid — cancel the ride if
          those need to change.
        </div>
      )}

      <form onSubmit={submit} className="mt-6 rounded-[22px] ring-1 ring-black/5 bg-card p-5 sm:p-7 space-y-4">
        <div>
          <label className={label} htmlFor="ed-origin">Pick up</label>
          <PlaceInput
            id="ed-origin"
            className={field}
            value={origin}
            disabled={routeLocked}
            onChange={(v) => {
              setOrigin(v);
              setOriginPick(null);
            }}
            onPick={(p) => setOriginPick(p)}
            placeholder="Square One, Mississauga, ON"
          />
        </div>

        <div>
          <label className={label} htmlFor="ed-destination">Drop off</label>
          <PlaceInput
            id="ed-destination"
            className={field}
            value={destination}
            disabled={routeLocked}
            onChange={(v) => {
              setDestination(v);
              setDestinationPick(null);
            }}
            onPick={(p) => setDestinationPick(p)}
            placeholder="ByWard Market, Ottawa, ON"
          />
          {!routeLocked && (
            <p className="text-xs text-muted-foreground mt-1.5">
              To change the route, pick both addresses again from the suggestions.
            </p>
          )}
        </div>

        {(routing || routeInfo) && (
          <div className="rounded-[14px] bg-background ring-1 ring-line px-4 py-3 text-sm">
            {routing ? (
              <span className="text-muted-foreground">Measuring the new route…</span>
            ) : (
              <span className="text-foreground font-medium">
                {formatDistance(routeInfo!.distanceKm)} · {formatDuration(routeInfo!.durationMin)} drive
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="ed-date">Date</label>
            <input id="ed-date" type="date" className={field} value={date} disabled={scheduleLocked} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className={label} htmlFor="ed-depart">Departure time</label>
            <input id="ed-depart" type="time" className={field} value={time} disabled={scheduleLocked} onChange={(e) => setTime(e.target.value)} required />
          </div>
          <div>
            <label className={label} htmlFor="ed-arrive">Arrival time (optional)</label>
            <input id="ed-arrive" type="time" className={field} value={arriveTime} disabled={scheduleLocked} onChange={(e) => setArriveTime(e.target.value)} />
          </div>
          <div>
            <label className={label} htmlFor="ed-seats">Seats offered</label>
            <input id="ed-seats" type="number" min={Math.max(1, seatsTaken)} max={8} className={field} value={seatsTotal} onChange={(e) => setSeatsTotal(e.target.value)} required />
          </div>
          <div>
            <label className={label} htmlFor="ed-price">Price per seat (CAD)</label>
            <input id="ed-price" type="number" min={0} step="0.5" className={field} value={price} disabled={priceLocked} onChange={(e) => setPrice(e.target.value)} required />
          </div>
          <div>
            <label className={label} htmlFor="ed-car">Car</label>
            <input id="ed-car" className={field} value={car} onChange={(e) => setCar(e.target.value)} placeholder="Toyota RAV4" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="ed-kind">Trip type</label>
            <select id="ed-kind" className={field} value={rideKind} onChange={(e) => setRideKind(e.target.value)}>
              <option value="cost_share">I'm already travelling (cost sharing)</option>
              <option value="commercial">I provide transportation on this route</option>
            </select>
          </div>
          <div>
            <label className={label} htmlFor="ed-flex">Pickup flexibility</label>
            <select id="ed-flex" className={field} value={pickupFlexibility} onChange={(e) => setPickupFlexibility(e.target.value)}>
              <option value="on_route">Only along my route</option>
              <option value="meeting_point">At a meeting point</option>
              <option value="flexible">I can detour to pick riders up</option>
            </select>
          </div>
          {pickupFlexibility !== "on_route" && (
            <div>
              <label className={label} htmlFor="ed-detour">Maximum detour (minutes)</label>
              <input id="ed-detour" type="number" min={0} max={45} className={field} value={maxDetour} onChange={(e) => setMaxDetour(e.target.value)} />
            </div>
          )}
        </div>

        <div>
          <label className={label} htmlFor="ed-notes">Notes for riders</label>
          <textarea id="ed-notes" className={`${field} min-h-24`} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <button
          type="submit"
          disabled={busy || routing}
          className="w-full rounded-[12px] bg-primary hover:bg-primary-deep text-primary-foreground text-sm font-semibold py-3 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
