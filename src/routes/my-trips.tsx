import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatPlace, dayOf, money, timeOf, type Ride } from "@/lib/rides";
import { cancelMyBooking, cancelMyRide } from "@/lib/booking.functions";
import { quoteRefund } from "@/lib/cancellation";

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
  service_fee: number;
  tax_amount: number;
  refund_amount: number;
  payment_status: string;
  status: string;
  rides: Ride | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Seat hold expired",
};

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "confirmed" || status === "completed"
      ? "bg-primary/10 text-primary-deep"
      : status === "pending_payment"
        ? "bg-amber-500/10 text-amber-700"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function MyTrips() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const runCancelBooking = useServerFn(cancelMyBooking);
  const runCancelRide = useServerFn(cancelMyRide);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<"upcoming" | "past" | "cancelled">("upcoming");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const {
    data: bookings,
    isLoading: bookingsLoading,
    isError: bookingsError,
    refetch: refetchBookings,
  } = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, seats, total_amount, service_fee, tax_amount, refund_amount, payment_status, status, rides(*)",
        )
        .eq("rider_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BookingRow[];
    },
  });

  const {
    data: driving,
    isLoading: drivingLoading,
    isError: drivingError,
  } = useQuery({
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

  async function onCancelBooking(b: BookingRow) {
    const quote = quoteRefund({
      totalAmount: Number(b.total_amount),
      serviceFee: Number(b.service_fee),
      taxAmount: Number(b.tax_amount ?? 0),
      departAt: b.rides?.depart_at ?? new Date().toISOString(),
      paid: b.payment_status === "paid",
    });
    const confirmed = window.confirm(
      `Cancel this booking?\n\n${quote.label}\nEstimated refund: ${money(quote.amount)}\n\nThe final amount is confirmed by Crossline when the cancellation is processed.`,
    );
    if (!confirmed) return;
    setBusyId(b.id);
    try {
      const result = await runCancelBooking({ data: { bookingId: b.id } });
      if (!result.ok) throw new Error(result.error);
      toast.success(
        result.refunded > 0
          ? `Booking cancelled — ${money(result.refunded)} refunded.`
          : "Booking cancelled.",
      );
      await queryClient.invalidateQueries({ queryKey: ["my-bookings", user?.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel this booking");
    } finally {
      setBusyId(null);
    }
  }

  async function onCancelRide(r: Ride) {
    const confirmed = window.confirm(
      "Cancel this ride?\n\nEvery rider who booked will be fully refunded and notified. The ride stays on your record as cancelled — it is not deleted.",
    );
    if (!confirmed) return;
    setBusyId(r.id);
    try {
      const result = await runCancelRide({ data: { rideId: r.id, reason: "" } });
      if (!result.ok) throw new Error(result.error);
      toast.success(
        result.cancelledBookings > 0
          ? `Ride cancelled — ${result.cancelledBookings} booking(s) refunded.`
          : "Ride cancelled.",
      );
      await queryClient.invalidateQueries({ queryKey: ["my-rides", user?.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel this ride");
    } finally {
      setBusyId(null);
    }
  }

  const now = Date.now();
  const bucketed = {
    upcoming: [] as BookingRow[],
    past: [] as BookingRow[],
    cancelled: [] as BookingRow[],
  };
  for (const b of bookings ?? []) {
    if (b.status === "cancelled" || b.status === "expired") bucketed.cancelled.push(b);
    else if (b.status === "completed" || (b.rides && new Date(b.rides.depart_at).getTime() < now))
      bucketed.past.push(b);
    else bucketed.upcoming.push(b);
  }
  const shown = bucketed[tab];

  return (
    <div className="mx-auto max-w-2xl px-5 sm:px-8 pt-8 pb-16">
      <h1 className="font-display font-semibold text-foreground text-2xl">My trips</h1>

      <div className="mt-5 flex gap-2">
        {(["upcoming", "past", "cancelled"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`rounded-full px-4 py-2 text-xs font-medium ring-1 capitalize transition ${
              tab === t
                ? "bg-foreground text-background ring-transparent"
                : "bg-background text-muted-foreground ring-line"
            }`}
          >
            {t} ({bucketed[t].length})
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {bookingsLoading && (
          <div className="rounded-[18px] ring-1 ring-black/5 bg-card p-5 text-sm text-muted-foreground">
            Loading your trips…
          </div>
        )}
        {bookingsError && (
          <div className="rounded-[18px] ring-1 ring-black/5 bg-card p-5 text-sm">
            <p className="text-foreground">We couldn&apos;t load your trips.</p>
            <button
              type="button"
              onClick={() => refetchBookings()}
              className="mt-2 text-primary-deep font-medium"
            >
              Try again
            </button>
          </div>
        )}
        {shown.map((b) => {
          const cancellable =
            tab === "upcoming" && (b.status === "pending_payment" || b.status === "confirmed");
          return (
            <div key={b.id} className="rounded-[18px] ring-1 ring-black/5 bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-foreground">
                    {formatPlace(b.rides?.origin)} → {formatPlace(b.rides?.destination)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {b.rides ? `${dayOf(b.rides.depart_at)} · ${timeOf(b.rides.depart_at)}` : "Trip removed"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Pickup {formatPlace(b.rides?.origin) || "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {b.seats} seat{b.seats === 1 ? "" : "s"}
                    {Number(b.refund_amount) > 0
                      ? ` · ${money(Number(b.refund_amount))} refunded`
                      : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display font-semibold text-foreground">
                    {money(Number(b.total_amount))}
                  </p>
                  <div className="mt-2">
                    <StatusPill status={b.status} />
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4">
                {b.rides && (
                  <Link
                    to="/rides/$rideId"
                    params={{ rideId: b.rides.id }}
                    search={{}}
                    className="text-sm text-primary-deep font-medium"
                  >
                    View ride
                  </Link>
                )}
                {cancellable && (
                  <button
                    type="button"
                    disabled={busyId === b.id}
                    onClick={() => onCancelBooking(b)}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    {busyId === b.id ? "Cancelling…" : "Cancel"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {!bookingsLoading && shown.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nothing here yet.{" "}
            <Link to="/rides" search={{}} className="text-primary-deep font-medium">
              Find a ride
            </Link>
          </p>
        )}
      </div>

      <h2 className="font-display font-semibold text-foreground text-xl mt-10 mb-4">
        Rides you're driving
      </h2>
      <div className="space-y-3">
        {drivingLoading && (
          <div className="rounded-[18px] ring-1 ring-black/5 bg-card p-5 text-sm text-muted-foreground">
            Loading your rides…
          </div>
        )}
        {drivingError && (
          <p className="text-sm text-muted-foreground">We couldn't load your rides right now.</p>
        )}
        {driving?.map((r) => (
          <div key={r.id} className="rounded-[18px] ring-1 ring-black/5 bg-card p-5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex-1 min-w-[200px]">
                <p className="font-medium text-foreground">
                  {formatPlace(r.origin)} → {formatPlace(r.destination)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {dayOf(r.depart_at)} · {timeOf(r.depart_at)} · {r.seats_available}/{r.seats_total}{" "}
                  seats open
                  {r.status !== "published" ? ` · ${r.status}` : ""}
                </p>
              </div>
              <span className="font-display font-semibold text-foreground">
                {money(Number(r.price_per_seat))}
              </span>
              <Link
                to="/rides/$rideId"
                params={{ rideId: r.id }}
                className="text-sm text-primary-deep font-medium"
              >
                View
              </Link>
              {r.status === "published" && (
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => onCancelRide(r)}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  {busyId === r.id ? "Cancelling…" : "Cancel ride"}
                </button>
              )}
            </div>
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
