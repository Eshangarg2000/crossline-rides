import { Link } from "@tanstack/react-router";
import { BadgeCheck, Clock, MapPin, Star } from "lucide-react";
import { formatPlace, dayOf, initials, money, timeOf, type RideWithDriver } from "@/lib/rides";

export type RiderSearch = {
  fromLat?: number | undefined;
  fromLng?: number | undefined;
  toLat?: number | undefined;
  toLng?: number | undefined;
};

export function nearLabel(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

/** Honest pickup wording. The backend stores the driver's stated preference —
    Crossline does not calculate a rider-specific detour, so we never imply one. */
export function pickupLabel(ride: RideWithDriver) {
  switch (ride.pickup_flexibility) {
    case "flexible":
      return ride.max_detour_min
        ? `Driver willing to detour up to ${ride.max_detour_min} min`
        : "Driver willing to detour for pickup";
    case "meeting_point":
      return "Meeting point pickup";
    default:
      return "Pickup along the driver's route";
  }
}

/** Search result: who, when, how convenient, how much. */
export function RideRow({
  ride,
  pickupKm,
  dropoffKm,
  riderSearch,
}: {
  ride: RideWithDriver;
  pickupKm?: number | null;
  dropoffKm?: number | null;
  riderSearch?: RiderSearch;
}) {
  const name = ride.driver?.full_name || "Driver";
  const isProvider = ride.ride_kind === "commercial";

  return (
    <Link
      to="/rides/$rideId"
      params={{ rideId: ride.id }}
      search={riderSearch ?? {}}
      className="block rounded-[18px] bg-card ring-1 ring-black/5 p-4 sm:p-5 hover:ring-primary/40 transition"
    >
      <div className="flex items-start gap-3">
        {ride.driver?.avatar_url ? (
          <img
            src={ride.driver.avatar_url}
            alt=""
            width={44}
            height={44}
            loading="lazy"
            className="size-11 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="size-11 rounded-full bg-sun grid place-items-center font-semibold text-sm text-foreground shrink-0">
            {initials(name)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px] font-semibold text-foreground">{name}</span>
            <span className="inline-flex items-center gap-1 text-xs text-primary-deep font-medium">
              <BadgeCheck className="size-3.5" /> Verified
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="size-3.5" /> {ride.driver?.rating?.toFixed(1) ?? "5.0"}
            </span>
          </div>

          <span className="mt-1.5 inline-block text-[11px] font-medium rounded-full bg-background ring-1 ring-line px-2 py-0.5 text-muted-foreground">
            {isProvider ? "Transportation provider" : "Personal ride"}
          </span>

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
              {pickupKm != null ? `Pickup ${nearLabel(pickupKm)} from you` : pickupLabel(ride)}
            </p>
            {dropoffKm != null && (
              <p className="flex items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0" />
                Drop-off {nearLabel(dropoffKm)} from your destination
              </p>
            )}
            {pickupKm != null && <p className="text-xs">{pickupLabel(ride)}</p>}
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="font-display font-semibold text-foreground text-xl leading-none">
            {money(Number(ride.price_per_seat))}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">per seat</p>
          <p className="text-xs text-primary-deep mt-2 font-medium">
            {ride.seats_available} seat{ride.seats_available === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </Link>
  );
}
