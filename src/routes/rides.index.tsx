import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RideRow } from "@/components/RideRow";
import { RideSearchPanel, type PickupPreference } from "@/components/RideSearchPanel";
import { boundsAround, formatPlace, searchRides } from "@/lib/rides";
import { matchRides } from "@/lib/matching";
import { ChevronDown, Search } from "lucide-react";

type Search = {
  from?: string | undefined;
  to?: string | undefined;
  date?: string | undefined;
  seats?: number | undefined;
  fromLat?: number | undefined;
  fromLng?: number | undefined;
  toLat?: number | undefined;
  toLng?: number | undefined;
  pickup?: PickupPreference | undefined;
};

const num = (v: unknown) => (v === undefined || v === "" || Number.isNaN(Number(v)) ? undefined : Number(v));

const isPreference = (v: unknown): v is PickupPreference =>
  v === "closest" || v === "meeting" || v === "flexible";

/** Rider-side presentation filter for "Closest pickup". Conservative: it only
    narrows the list when the rider explicitly asked for it, it is announced on
    screen, and it can be switched off in one tap. The matching engine itself
    is untouched. */
const CLOSEST_PICKUP_KM = 3;

type KindFilter = "all" | "cost_share" | "commercial";

export const Route = createFileRoute("/rides/")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    from: typeof search['from'] === "string" ? search['from'] : undefined,
    to: typeof search['to'] === "string" ? search['to'] : undefined,
    date: typeof search['date'] === "string" ? search['date'] : undefined,
    seats: search['seats'] ? Number(search['seats']) : undefined,
    fromLat: num(search['fromLat']),
    fromLng: num(search['fromLng']),
    toLat: num(search['toLat']),
    toLng: num(search['toLng']),
    pickup: isPreference(search['pickup']) ? search['pickup'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Rides heading your way — Crossline" },
      {
        name: "description",
        content:
          "See transportation already travelling your direction across the GTA, Metro Vancouver and beyond. Compare pickup convenience, departure time and CAD fares.",
      },
      { property: "og:title", content: "Rides heading your way — Crossline" },
      {
        property: "og:description",
        content: "Transportation already travelling your direction, closest pickup first.",
      },
    ],
  }),
  component: RidesPage,
});

function RidesPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/rides/" });
  const [editing, setEditing] = useState(false);
  const [kind, setKind] = useState<KindFilter>("all");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [afterHour, setAfterHour] = useState<number | null>(null);
  const [showAllPickups, setShowAllPickups] = useState(false);

  const riderOrigin =
    search.fromLat != null && search.fromLng != null
      ? { lat: search.fromLat, lng: search.fromLng }
      : null;
  const riderDestination =
    search.toLat != null && search.toLng != null
      ? { lat: search.toLat, lng: search.toLng }
      : null;
  // Route-intelligent matching needs both ends picked from the map suggestions.
  const proximity = Boolean(riderOrigin && riderDestination);

  const { data: rides, isLoading } = useQuery({
    queryKey: ["rides", search],
    queryFn: () =>
      proximity
        ? searchRides({
            date: search.date,
            seats: search.seats,
            requireGeometry: true,
            near: boundsAround([riderOrigin!, riderDestination!]),
          })
        : searchRides({ from: search.from, to: search.to, date: search.date, seats: search.seats }),
  });

  // Text search keeps the old behaviour; proximity search runs the matcher.
  const matches = useMemo(
    () =>
      proximity
        ? matchRides(rides ?? [], riderOrigin, riderDestination)
        : (rides ?? []).map((ride) => ({ ride, pickupKm: null, dropoffKm: null })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rides, proximity, search.fromLat, search.fromLng, search.toLat, search.toLng],
  );

  const wantsClosest = search.pickup === "closest" && proximity && !showAllPickups;

  const hiddenByPickup = wantsClosest
    ? matches.filter((m) => m.pickupKm != null && m.pickupKm > CLOSEST_PICKUP_KM).length
    : 0;

  const visible = matches.filter((m) => {
    if (wantsClosest && m.pickupKm != null && m.pickupKm > CLOSEST_PICKUP_KM) return false;
    if (kind !== "all" && (m.ride.ride_kind ?? "cost_share") !== kind) return false;
    if (maxPrice != null && Number(m.ride.price_per_seat) > maxPrice) return false;
    if (afterHour != null && new Date(m.ride.depart_at).getHours() < afterHour) return false;
    return true;
  });

  const filtersActive = kind !== "all" || maxPrice != null || afterHour != null;

  function resetFilters() {
    setKind("all");
    setMaxPrice(null);
    setAfterHour(null);
  }

  const chip = (active: boolean) =>
    `shrink-0 rounded-full px-3.5 py-2 text-xs font-medium ring-1 transition ${
      active ? "bg-foreground text-background ring-transparent" : "bg-background text-muted-foreground ring-line"
    }`;

  return (
    <div className="mx-auto max-w-2xl px-5 sm:px-8 pt-6 pb-20">
      {editing ? (
        <RideSearchPanel
          initial={search}
          submitLabel="Search"
          onSearch={(v) => {
            setEditing(false);
            navigate({ search: () => ({ ...v }) });
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full flex items-center gap-3 rounded-[18px] bg-card ring-1 ring-black/5 px-4 py-3.5 text-left"
        >
          <Search className="size-4 text-muted-foreground shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-medium text-foreground truncate">
              {formatPlace(search.from) || "Pickup"} → {formatPlace(search.to) || "Destination"}
            </span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              {search.date
                ? new Date(`${search.date}T00:00`).toLocaleDateString("en-CA", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })
                : "Any day"}{" "}
              · {search.seats ?? 1} passenger{(search.seats ?? 1) === 1 ? "" : "s"}
            </span>
          </span>
          <ChevronDown className="size-4 text-muted-foreground shrink-0" />
        </button>
      )}

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        <button type="button" className={chip(kind === "cost_share")} onClick={() => setKind(kind === "cost_share" ? "all" : "cost_share")}>
          Personal ride
        </button>
        <button type="button" className={chip(kind === "commercial")} onClick={() => setKind(kind === "commercial" ? "all" : "commercial")}>
          Transportation provider
        </button>
        <button type="button" className={chip(afterHour === 12)} onClick={() => setAfterHour(afterHour === 12 ? null : 12)}>
          Leaves after 12pm
        </button>
        <button type="button" className={chip(maxPrice === 40)} onClick={() => setMaxPrice(maxPrice === 40 ? null : 40)}>
          Under $40
        </button>
        {filtersActive && (
          <button type="button" onClick={resetFilters} className="shrink-0 px-3 py-2 text-xs font-medium text-muted-foreground underline">
            Clear
          </button>
        )}
      </div>

      <div className="mt-5 mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? "Finding transportation…"
            : `${visible.length} option${visible.length === 1 ? "" : "s"} heading your way`}
        </p>
        <span className="text-xs text-muted-foreground shrink-0">
          {proximity ? "Most convenient first" : "Earliest first"}
        </span>
      </div>

      {wantsClosest && hiddenByPickup > 0 && (
        <div className="mb-3 rounded-[14px] bg-background ring-1 ring-line px-4 py-3 text-xs text-muted-foreground">
          Showing pickups within {CLOSEST_PICKUP_KM} km because you chose closest pickup.{" "}
          <button
            type="button"
            onClick={() => setShowAllPickups(true)}
            className="font-semibold text-foreground underline"
          >
            Show {hiddenByPickup} more option{hiddenByPickup === 1 ? "" : "s"}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {visible.map((m) => (
          <RideRow
            key={m.ride.id}
            ride={m.ride}
            pickupKm={m.pickupKm}
            dropoffKm={m.dropoffKm}
            riderSearch={{
              fromLat: search.fromLat,
              fromLng: search.fromLng,
              toLat: search.toLat,
              toLng: search.toLng,
            }}
          />
        ))}

        {!isLoading && visible.length === 0 && (
          <div className="rounded-[18px] ring-1 ring-black/5 bg-card p-6">
            <p className="text-[15px] font-medium text-foreground">
              We couldn&apos;t find transportation for this trip right now.
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {filtersActive && <li>· Clear your filters — some options are hidden.</li>}
              <li>· Try a pickup point closer to a main route.</li>
              <li>· Choose a nearby meeting point instead of your exact address.</li>
              <li>· Try a different departure day or time.</li>
              <li>· Search a wider area by leaving the date open.</li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              {filtersActive && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-[12px] bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5"
                >
                  Clear filters
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-[12px] bg-background ring-1 ring-line text-sm font-semibold text-foreground px-4 py-2.5"
              >
                Change search
              </button>
              {search.date && (
                <Link
                  to="/rides"
                  search={{ ...search, date: undefined }}
                  className="rounded-[12px] bg-background ring-1 ring-line text-sm font-semibold text-foreground px-4 py-2.5"
                >
                  Any day
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
