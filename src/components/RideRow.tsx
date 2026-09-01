import { Link } from "@tanstack/react-router";
import { BadgeCheck, Clock, MapPin, Star } from "lucide-react";
import { formatPlace, dayOf, initials, money, timeOf, type RideWithDriver } from "@/lib/rides";
import { formatDistance, formatDuration } from "@/lib/maps";

function pickupLabel(ride: RideWithDriver) {
  switch (ride.pickup_flexibility) {
    case "flexible":
      return ride.max_detour_min
        ? `Flexible pickup · up to ${ride.max_detour_min} min detour`
        : "Flexible pickup near you";
    case "meeting_point":
      return "Meeting point pickup";
    default:
      return "Pickup along the driver's route";
  }
}

/** Search result: driver, trust, timing, pickup convenience, price. */
export function RideRow({
  ride,
  pickupKm,
  dropoffKm,
}: {
  ride: RideWithDriver;
  pickupKm?: number | null;
  dropoffKm?: number | null;
}) {
  const name = ride.driver?.full_name || "Driver";
  const isProvider = ride.ride_kind === "commercial";

  return (
    <Link
      to="/rides/$rideId"
      params={{ rideId: ride.id }}
      className="block rounded-[18px] bg-card ring-1 ring-black/5 p-4 sm:p-5 hover:ring-primary/40 transition"
    >
      <div className="flex items-start gap-3">
        <div className="size-11 rounded-full bg-sun grid place-items-center font-semibold text-sm text-foreground shrink-0">
          {initials(name)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px] font-semibold text-foreground">{name}</span>
            <span className="inline-flex items-center gap-1 text-xs text-primary-deep font-medium">
              <BadgeCheck className="size-3.5" /> Verified
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="size-3.5" /> {ride.driver?.rating?.toFixed(1) ?? "5.0"}
            </span>
            {isProvider && (
              <span className="text-[11px] font-medium rounded-full bg-sun px-2 py-0.5 text-foreground">
                Transport provider
              </span>
            )}
          </div>

          <p className="mt-1.5 text-[15px] font-medium text-foreground truncate">
            {formatPlace(ride.origin)} → {formatPlace(ride.destination)}
          </p>

          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <Clock className="size-3.5 shrink-0" />
              Leaves {timeOf(ride.depart_at)} · {dayOf(ride.depart_at)}
              {ride.arrive_at ? ` · arrives ${timeOf(ride.arrive_at)}` : ""}
            </p>
            <p className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" />
              {pickupKm != null
                ? `${pickupKm < 1 ? `${Math.round(pickupKm * 1000)} m` : `${pickupKm.toFixed(1)} km`} from you · ${pickupLabel(ride)}`
                : pickupLabel(ride)}
            </p>
            {dropoffKm != null && (
              <p className="flex items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0" />
                Drop-off {dropoffKm < 1 ? `${Math.round(dropoffKm * 1000)} m` : `${dropoffKm.toFixed(1)} km`} from your destination
              </p>
            )}
            <p className="text-xs">
              {[
                ride.distance_km != null ? formatDistance(Number(ride.distance_km)) : null,
                ride.duration_min != null ? `${formatDuration(ride.duration_min)} drive` : null,
                ride.stops.length > 0 ? `${ride.stops.length} stop${ride.stops.length === 1 ? "" : "s"}` : "Direct",
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="font-display font-semibold text-foreground text-xl leading-none">
            {money(Number(ride.price_per_seat))}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">per seat</p>
          <p className="text-xs text-primary-deep mt-2 font-medium">
            {ride.seats_available} seat{ride.seats_available === 1 ? "" : "s"} left
          </p>
        </div>
      </div>
    </Link>
  );
}
