import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/post-ride")({
  head: () => ({
    meta: [
      { title: "Post a ride — Crossline Carpool" },
      {
        name: "description",
        content:
          "Drivers: publish your route, pickup and drop points, seats and price per seat for riders across the GTA and BC.",
      },
      { property: "og:title", content: "Post a ride — Crossline Carpool" },
      {
        property: "og:description",
        content: "Publish your route, stops, seats and CAD price per seat.",
      },
    ],
  }),
  component: PostRide,
});

function PostRide() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [stops, setStops] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("08:00");
  const [arriveTime, setArriveTime] = useState("");
  const [seatsTotal, setSeatsTotal] = useState("3");
  const [price, setPrice] = useState("35");
  const [car, setCar] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

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
          stops: stops
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          depart_at: departAt.toISOString(),
          arrive_at: arriveAt ? arriveAt.toISOString() : null,
          seats_total: seats,
          seats_available: seats,
          price_per_seat: Number(price),
          car: car || null,
          notes: notes || null,
        })
        .select("id")
        .single();

      if (error) throw error;
      toast.success("Ride published");
      navigate({ to: "/rides/$rideId", params: { rideId: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not publish ride");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-[12px] bg-background ring-1 ring-black/5 px-3.5 py-2.5 text-sm text-foreground outline-none focus:ring-primary";
  const label =
    "block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1.5";

  return (
    <div className="mx-auto max-w-2xl px-5 sm:px-8 pt-10 pb-16">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-deep">Drive with us</p>
      <h1 className="font-display font-semibold text-foreground text-3xl mt-2">Post a ride</h1>
      <p className="text-sm text-muted-foreground mt-2">
        Add your route points and set a fair price per seat. Riders pay in app when they book.
      </p>

      <form onSubmit={submit} className="mt-7 rounded-[22px] ring-1 ring-black/5 bg-card p-5 sm:p-7 space-y-4">
        <div>
          <label className={label} htmlFor="pr-origin">Pick up</label>
          <input id="pr-origin" className={field} value={origin} onChange={(e) => setOrigin(e.target.value)} required placeholder="Mississauga, ON" />
        </div>
        <div>
          <label className={label} htmlFor="pr-stops">Stops along the way (comma separated)</label>
          <input id="pr-stops" className={field} value={stops} onChange={(e) => setStops(e.target.value)} placeholder="Oakville, Burlington" />
        </div>
        <div>
          <label className={label} htmlFor="pr-destination">Drop off</label>
          <input id="pr-destination" className={field} value={destination} onChange={(e) => setDestination(e.target.value)} required placeholder="Ottawa, ON" />
        </div>

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
