import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatPlace, dayOf, money, timeOf, type Ride } from "@/lib/rides";

export const Route = createFileRoute("/my-trips")({
  head: () => ({
    meta: [
      { title: "My trips — Crossline Carpool" },
      {
        name: "description",
        content: "See the carpool seats you have booked and the rides you are driving on Crossline.",
      },
      { property: "og:title", content: "My trips — Crossline Carpool" },
      { property: "og:description", content: "Your booked seats and the rides you are driving." },
    ],
  }),
  component: MyTrips,
});

type BookingRow = {
  id: string;
  seats: number;
  total_amount: number;
  payment_status: string;
  status: string;
  rides: Ride | null;
};

function MyTrips() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data: bookings } = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, seats, total_amount, payment_status, status, rides(*)")
        .eq("rider_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BookingRow[];
    },
  });

  const { data: driving } = useQuery({
    queryKey: ["my-rides", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select("*")
        .eq("driver_id", user!.id)
        .order("depart_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Ride[];
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-5 sm:px-8 pt-10 pb-16">
      <h1 className="font-display font-semibold text-foreground text-3xl">My trips</h1>

      <h2 className="font-display font-semibold text-foreground text-xl mt-8 mb-4">Seats you booked</h2>
      <div className="space-y-3">
        {bookings?.map((b) => (
          <div key={b.id} className="rounded-[18px] ring-1 ring-black/5 bg-card p-5 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">
                {formatPlace(b.rides?.origin)} → {formatPlace(b.rides?.destination)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {b.rides ? `${dayOf(b.rides.depart_at)} · ${timeOf(b.rides.depart_at)} · ` : ""}
                {b.seats} seat{b.seats === 1 ? "" : "s"} · {b.payment_status === "paid" ? "paid in app" : b.payment_status}
              </p>
            </div>
            <span className="font-display font-semibold text-foreground">{money(Number(b.total_amount))}</span>
            {b.rides && (
              <Link
                to="/rides/$rideId"
                params={{ rideId: b.rides.id }}
                className="text-sm text-primary-deep font-medium"
              >
                View
              </Link>
            )}
          </div>
        ))}
        {bookings?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No bookings yet.{" "}
            <Link to="/rides" className="text-primary-deep font-medium">
              Find a ride
            </Link>
          </p>
        )}
      </div>

      <h2 className="font-display font-semibold text-foreground text-xl mt-10 mb-4">Rides you're driving</h2>
      <div className="space-y-3">
        {driving?.map((r) => (
          <div key={r.id} className="rounded-[18px] ring-1 ring-black/5 bg-card p-5 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">
                {formatPlace(r.origin)} → {formatPlace(r.destination)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {dayOf(r.depart_at)} · {timeOf(r.depart_at)} · {r.seats_available}/{r.seats_total} seats open
              </p>
            </div>
            <span className="font-display font-semibold text-foreground">
              {money(Number(r.price_per_seat))}
            </span>
            <Link to="/rides/$rideId" params={{ rideId: r.id }} className="text-sm text-primary-deep font-medium">
              View
            </Link>
          </div>
        ))}
        {driving?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            You haven't posted a ride yet.{" "}
            <Link to="/post-ride" className="text-primary-deep font-medium">
              Post a ride
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
