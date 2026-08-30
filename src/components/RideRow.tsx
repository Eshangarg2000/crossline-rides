import { Link } from "@tanstack/react-router";
import { dayOf, initials, money, timeOf, type RideWithDriver } from "@/lib/rides";

export function RideRow({ ride }: { ride: RideWithDriver }) {
  const name = ride.driver?.full_name || "Driver";

  return (
    <div className="rounded-[18px] ring-1 ring-black/5 bg-card overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex items-center gap-3 shrink-0">
            <div className="size-12 rounded-[10px] bg-sun grid place-items-center font-display font-semibold text-foreground">
              {initials(name)}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{name}</p>
              <p className="text-xs text-muted-foreground">
                {ride.driver?.rating?.toFixed(1) ?? "5.0"} · {ride.driver?.trips_count ?? 0} trips
                {ride.car ? ` · ${ride.car}` : ""}
              </p>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4 text-sm font-medium text-foreground">
              <span className="truncate">
                {timeOf(ride.depart_at)} · {ride.origin}
              </span>
              <span className="truncate text-right">
                {ride.arrive_at ? `${timeOf(ride.arrive_at)} · ` : ""}
                {ride.destination}
              </span>
            </div>
            <div className="relative my-3 h-px route-line">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 size-2.5 rounded-full bg-primary" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-2.5 rounded-full bg-foreground/40" />
              <span className="absolute right-0 top-1/2 -translate-y-1/2 size-2.5 rounded-full bg-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              {dayOf(ride.depart_at)}
              {ride.stops.length > 0
                ? ` · stops: ${ride.stops.join(" → ")}`
                : " · direct, no stops"}
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end gap-3 shrink-0">
            <div className="text-right">
              <p className="font-display font-semibold text-foreground text-2xl leading-none">
                {money(Number(ride.price_per_seat))}
                <span className="text-sm text-muted-foreground font-sans font-medium">/seat</span>
              </p>
              <p className="text-xs text-primary-deep mt-1 font-medium">
                {ride.seats_available} seat{ride.seats_available === 1 ? "" : "s"} left
              </p>
            </div>
            <Link
              to="/rides/$rideId"
              params={{ rideId: ride.id }}
              className="text-sm font-medium text-foreground bg-background rounded-lg px-3.5 py-2 ring-1 ring-line"
            >
              View &amp; book
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
