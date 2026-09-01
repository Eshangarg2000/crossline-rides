import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RideRow } from "@/components/RideRow";
import { RideSearchPanel } from "@/components/RideSearchPanel";
import { searchRides } from "@/lib/rides";
import { matchRides } from "@/lib/matching";


type Search = {
  from?: string | undefined;
  to?: string | undefined;
  date?: string | undefined;
  seats?: number | undefined;
  fromLat?: number | undefined;
  fromLng?: number | undefined;
  toLat?: number | undefined;
  toLng?: number | undefined;
};

const num = (v: unknown) => (v === undefined || v === "" || Number.isNaN(Number(v)) ? undefined : Number(v));

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
  }),
  head: () => ({
    meta: [
      { title: "Find a carpool ride — Crossline" },
      {
        name: "description",
        content:
          "Search shared intercity rides across the GTA and Metro Vancouver. Compare departure times, stops and CAD fares, then book a seat.",
      },
      { property: "og:title", content: "Find a carpool ride — Crossline" },
      {
        property: "og:description",
        content: "Search shared intercity rides across the GTA and Metro Vancouver.",
      },
    ],
  }),
  component: RidesPage,
});

function RidesPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/rides/" });

  const riderOrigin =
    search.fromLat != null && search.fromLng != null
      ? { lat: search.fromLat, lng: search.fromLng }
      : null;
  const riderDestination =
    search.toLat != null && search.toLng != null
      ? { lat: search.toLat, lng: search.toLng }
      : null;
  const proximity = Boolean(riderOrigin || riderDestination);

  const { data: rides, isLoading } = useQuery({
    queryKey: ["rides", search],
    queryFn: () =>
      // With map coordinates we match against the driver's whole route instead of
      // requiring the typed origin/destination text to line up.
      searchRides(
        proximity
          ? { date: search.date, seats: search.seats }
          : { from: search.from, to: search.to, date: search.date, seats: search.seats },
      ),
  });

  const matches = matchRides(rides ?? [], riderOrigin, riderDestination);

  return (
    <div className="mx-auto max-w-2xl px-5 sm:px-8 pt-8 pb-16">
      <h1 className="font-display font-semibold text-foreground text-2xl">Find a ride</h1>

      <div className="mt-5">
        <RideSearchPanel
          initial={search}
          submitLabel="Search"
          onSearch={(v) => navigate({ search: () => ({ ...v }) })}
        />
      </div>

      <div className="mt-8 flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? "Finding rides…"
            : `${matches.length} ride${matches.length === 1 ? "" : "s"} heading your way`}
        </p>
        <span className="text-xs text-muted-foreground">
          {proximity ? "Closest pickup first" : "Earliest first"}
        </span>
      </div>

      <div className="space-y-3">
        {matches.map((m) => (
          <RideRow key={m.ride.id} ride={m.ride} pickupKm={m.pickupKm} dropoffKm={m.dropoffKm} />
        ))}
        {!isLoading && matches.length === 0 && (
          <div className="rounded-[18px] ring-1 ring-black/5 bg-card p-6 text-center">
            <p className="font-medium text-foreground">No trips on this route yet</p>
            <p className="text-sm text-muted-foreground mt-1.5">
              Try a nearby pickup point or a different day.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

