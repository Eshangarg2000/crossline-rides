import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PlaceInput } from "@/components/PlaceInput";
import { computeRoute } from "@/lib/maps.functions";
import { formatDistance, formatDuration, suggestedFare, type PlacePick } from "@/lib/maps";
import { money } from "@/lib/rides";
import { getMyDriverApplication, isVerifiedDriver, statusCopy } from "@/lib/driver";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/post-ride")({
  head: () => ({
    meta: [
      { title: "Post a ride — Crossline Carpool" },
      {
        name: "description",
        content:
          "Drivers: publish your route with verified addresses, real mileage and a fair price per seat for riders across the GTA and BC.",
      },
      { property: "og:title", content: "Post a ride — Crossline Carpool" },
      {
        property: "og:description",
        content: "Publish your route with Google Maps addresses, mileage and CAD price per seat.",
      },
    ],
  }),
  component: PostRide,
});

type RouteInfo = { distanceKm: number; durationMin: number; polyline: string | null };

function PostRide() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const runComputeRoute = useServerFn(computeRoute);

  const [origin, setOrigin] = useState("");
  const [originPick, setOriginPick] = useState<PlacePick | null>(null);
  const [destination, setDestination] = useState("");
  const [destinationPick, setDestinationPick] = useState<PlacePick | null>(null);
  const [stopDraft, setStopDraft] = useState("");
  const [stops, setStops] = useState<PlacePick[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("08:00");
  const [arriveTime, setArriveTime] = useState("");
  const [seatsTotal, setSeatsTotal] = useState("3");
  const [price, setPrice] = useState("35");
  const [car, setCar] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routing, setRouting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data: application, isLoading: applicationLoading } = useQuery({
    queryKey: ["driver-application", user?.id],
    queryFn: getMyDriverApplication,
    enabled: Boolean(user),
  });

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
        stops: stops.map((s) => `place_id:${s.placeId}`),
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
  }, [originPick, destinationPick, stops, runComputeRoute]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const departAt = new Date(`${date}T${time}`);
      const arriveAt = arriveTime ? new Date(`${date}T${arriveTime}`) : null;
      const seats = Number(seatsTotal) || 1;

      const { data, error } = await supabase
        .from("rides")
        .insert({
          driver_id: user.id,
          origin,
          destination,
          stops: stops.map((s) => s.address),
          depart_at: departAt.toISOString(),
          arrive_at: arriveAt ? arriveAt.toISOString() : null,
          seats_total: seats,
          seats_available: seats,
          price_per_seat: Number(price),
          car: car || null,
          notes: notes || null,
          origin_place_id: originPick?.placeId ?? null,
          destination_place_id: destinationPick?.placeId ?? null,
          origin_lat: originPick?.lat ?? null,
          origin_lng: originPick?.lng ?? null,
          destination_lat: destinationPick?.lat ?? null,
          destination_lng: destinationPick?.lng ?? null,
          distance_km: routeInfo?.distanceKm ?? null,
          duration_min: routeInfo?.durationMin ?? null,
          route_polyline: routeInfo?.polyline ?? null,
        })
        .select("id")
        .single();

      if (error) throw error;
      toast.success("Ride published");
      navigate({ to: "/rides/$rideId", params: { rideId: data.id } });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not publish ride";
      toast.error(
        /row-level security|policy/i.test(message)
          ? "Only approved drivers with a valid licence and insurance on file can publish a ride."
          : message,
      );
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-[12px] bg-background ring-1 ring-black/5 px-3.5 py-2.5 text-sm text-foreground outline-none focus:ring-primary";
  const label =
    "block text-sm font-medium text-foreground mb-1.5";

  const suggestion = routeInfo ? suggestedFare(routeInfo.distanceKm) : null;

  if (user && !applicationLoading && !isVerifiedDriver(application)) {
    const copy = application ? statusCopy(application.status) : null;
    return (
      <div className="mx-auto max-w-2xl px-5 sm:px-8 pt-10 pb-20">
        <p className="text-sm font-medium text-primary-deep">Drive with us</p>
        <h1 className="font-display font-semibold text-foreground text-3xl mt-2">
          Get verified before you post
        </h1>
        <p className="text-sm text-muted-foreground mt-3 max-w-[60ch]">
          Like other Canadian ride-share platforms, Crossline verifies every driver: full legal
          identity, a valid provincial licence, vehicle registration and current auto insurance.
          It takes about five minutes.
        </p>
        <div className="mt-6 rounded-[20px] ring-1 ring-black/5 bg-card p-5 sm:p-6">
          {copy && (
            <>
              <p className="text-sm font-semibold text-foreground">Status: {copy.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{copy.body}</p>
            </>
          )}
          {!copy && (
            <ul className="space-y-2 text-sm text-foreground">
              <li>· Driver's licence (front and back)</li>
              <li>· Vehicle registration / ownership</li>
              <li>· Proof of insurance (pink slip)</li>
              <li>· Driver's abstract, if you have one</li>
            </ul>
          )}
          <Link
            to="/become-driver"
            className="inline-block mt-5 rounded-[12px] bg-primary hover:bg-primary-deep text-primary-foreground text-sm font-semibold px-5 py-3"
          >
            {application ? "View my application" : "Start driver verification"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 sm:px-8 pt-10 pb-16">
      <p className="text-sm font-medium text-primary-deep">Drive with us</p>
      <h1 className="font-display font-semibold text-foreground text-3xl mt-2">Post a ride</h1>
      <p className="text-sm text-muted-foreground mt-2">
        Start typing an address and pick it from the list — Crossline measures the real driving
        distance and suggests a fair price per seat.
      </p>

      <form onSubmit={submit} className="mt-7 rounded-[22px] ring-1 ring-black/5 bg-card p-5 sm:p-7 space-y-4">
        <div>
          <label className={label} htmlFor="pr-origin">Pick up</label>
          <PlaceInput
            id="pr-origin"
            className={field}
            value={origin}
            onChange={(v) => {
              setOrigin(v);
              setOriginPick(null);
            }}
            onPick={(p) => setOriginPick(p)}
            required
            placeholder="Square One, Mississauga, ON"
          />
        </div>

        <div>
          <label className={label} htmlFor="pr-stops">Stops along the way (optional)</label>
          <PlaceInput
            id="pr-stops"
            className={field}
            value={stopDraft}
            onChange={setStopDraft}
            onPick={(p) => {
              setStops((prev) => (prev.length >= 5 ? prev : [...prev, p]));
              setStopDraft("");
            }}
            placeholder="Oakville GO, Oakville, ON"
          />
          {stops.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {stops.map((s, i) => (
                <button
                  key={`${s.placeId}-${i}`}
                  type="button"
                  onClick={() => setStops((prev) => prev.filter((_, idx) => idx !== i))}
                  className="rounded-full bg-background ring-1 ring-line px-3 py-1 text-xs text-foreground"
                >
                  {s.address} ×
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className={label} htmlFor="pr-destination">Drop off</label>
          <PlaceInput
            id="pr-destination"
            className={field}
            value={destination}
            onChange={(v) => {
              setDestination(v);
              setDestinationPick(null);
            }}
            onPick={(p) => setDestinationPick(p)}
            required
            placeholder="ByWard Market, Ottawa, ON"
          />
        </div>

        {(routing || routeInfo) && (
          <div className="rounded-[14px] bg-background ring-1 ring-line px-4 py-3 text-sm">
            {routing ? (
              <span className="text-muted-foreground">Measuring the route…</span>
            ) : (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="text-foreground font-medium">
                  {formatDistance(routeInfo!.distanceKm)} · {formatDuration(routeInfo!.durationMin)} drive
                </span>
                {suggestion != null && (
                  <button
                    type="button"
                    onClick={() => setPrice(String(suggestion))}
                    className="text-primary-deep font-medium"
                  >
                    Use suggested fare {money(suggestion)}/seat
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="pr-date">Date</label>
            <input id="pr-date" type="date" className={field} value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className={label} htmlFor="pr-depart">Departure time</label>
            <input id="pr-depart" type="time" className={field} value={time} onChange={(e) => setTime(e.target.value)} required />
          </div>
          <div>
            <label className={label} htmlFor="pr-arrive">Arrival time (optional)</label>
            <input id="pr-arrive" type="time" className={field} value={arriveTime} onChange={(e) => setArriveTime(e.target.value)} />
          </div>
          <div>
            <label className={label} htmlFor="pr-seats">Seats offered</label>
            <input id="pr-seats" type="number" min={1} max={8} className={field} value={seatsTotal} onChange={(e) => setSeatsTotal(e.target.value)} required />
          </div>
          <div>
            <label className={label} htmlFor="pr-price">Price per seat (CAD)</label>
            <input id="pr-price" type="number" min={0} step="0.5" className={field} value={price} onChange={(e) => setPrice(e.target.value)} required />
          </div>
          <div>
            <label className={label} htmlFor="pr-car">Car</label>
            <input id="pr-car" className={field} value={car} onChange={(e) => setCar(e.target.value)} placeholder="Toyota RAV4" />
          </div>
        </div>

        <div>
          <label className={label} htmlFor="pr-notes">Notes for riders</label>
          <textarea
            id="pr-notes"
            className={`${field} min-h-24`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="One bag each, no smoking, leaving from the GO lot."
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-[12px] bg-primary hover:bg-primary-deep text-primary-foreground text-sm font-semibold py-3 disabled:opacity-60"
        >
          {busy ? "Publishing…" : "Publish ride"}
        </button>
      </form>
    </div>
  );
}
