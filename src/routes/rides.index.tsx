import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RideRow } from "@/components/RideRow";
import { RideSearchPanel } from "@/components/RideSearchPanel";
import { searchRides } from "@/lib/rides";


type Search = {
  from?: string | undefined;
  to?: string | undefined;
  date?: string | undefined;
  seats?: number | undefined;
};

export const Route = createFileRoute("/rides/")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    from: typeof search['from'] === "string" ? search['from'] : undefined,
    to: typeof search['to'] === "string" ? search['to'] : undefined,
    date: typeof search['date'] === "string" ? search['date'] : undefined,
    seats: search['seats'] ? Number(search['seats']) : undefined,
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

  const [from, setFrom] = useState(search.from ?? "");
  const [to, setTo] = useState(search.to ?? "");
  const [date, setDate] = useState(search.date ?? "");
  const [seats, setSeats] = useState(String(search.seats ?? 1));

  const { data: rides, isLoading } = useQuery({
    queryKey: ["rides", search],
    queryFn: () => searchRides({ ...search }),
  });

  function apply(next: Search) {
    navigate({ search: () => next });
  }

  const field =
    "w-full rounded-[12px] bg-card ring-1 ring-black/5 px-3.5 py-2.5 text-sm text-foreground outline-none focus:ring-primary";
  const label =
    "block text-sm font-medium text-foreground mb-1.5";

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8 pt-10 pb-16">
      <h1 className="font-display font-semibold text-foreground text-3xl">Find a ride</h1>
      <p className="text-sm text-muted-foreground mt-2">
        Drivers post their route, pickup and drop points. You book a seat and pay in app.
      </p>

      <form
        className="mt-7 rounded-[20px] ring-1 ring-black/5 bg-sun/60 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          apply({
            from: from || undefined,
            to: to || undefined,
            date: date || undefined,
            seats: Number(seats) || 1,
          });
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-2 items-end">
          <div className="sm:col-span-4">
            <label className={label} htmlFor="search-from">From</label>
            <PlaceInput id="search-from" className={field} value={from} onChange={setFrom} onPick={(p) => setFrom(p.address)} placeholder="Toronto, ON" />
          </div>
          <div className="sm:col-span-4">
            <label className={label} htmlFor="search-to">To</label>
            <PlaceInput id="search-to" className={field} value={to} onChange={setTo} onPick={(p) => setTo(p.address)} placeholder="Ottawa, ON" />
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="search-date">Date</label>
            <input id="search-date" type="date" className={field} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="search-seats">Seats</label>
            <input id="search-seats"
              type="number"
              min={1}
              max={8}
              className={field}
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
            />
          </div>
          <div className="sm:col-span-12">
            <button
              type="submit"
              className="w-full block rounded-[12px] bg-primary hover:bg-primary-deep text-primary-foreground text-sm font-semibold py-3"
            >
              Search rides
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground mr-1">
            Popular corridors
          </span>
          {CORRIDORS.map((c) => (
            <button
              key={`${c.from}-${c.to}`}
              type="button"
              onClick={() => {
                setFrom(c.from);
                setTo(c.to);
                apply({ from: c.from, to: c.to });
              }}
              className="text-xs font-medium text-foreground bg-card ring-1 ring-line rounded-full px-3 py-1"
            >
              {c.from.split(",")[0]} → {c.to.split(",")[0]}
            </button>
          ))}
        </div>
      </form>

      <div className="mt-10 flex items-end justify-between mb-5">
        <div>
          <h2 className="font-display font-semibold text-foreground text-2xl">Upcoming departures</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Loading rides…" : `${rides?.length ?? 0} ride${rides?.length === 1 ? "" : "s"} found`}
          </p>
        </div>
        <div className="text-xs text-muted-foreground">Sort: Earliest</div>
      </div>

      <div className="space-y-4">
        {rides?.map((ride) => <RideRow key={ride.id} ride={ride} />)}
        {!isLoading && (rides?.length ?? 0) === 0 && (
          <div className="rounded-[18px] ring-1 ring-black/5 bg-card p-8 text-center">
            <p className="font-display font-semibold text-foreground text-xl">No rides on this route yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Try a nearby city, a different date — or post the ride yourself.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
