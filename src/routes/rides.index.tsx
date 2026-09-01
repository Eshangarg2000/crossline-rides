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

  const { data: rides, isLoading } = useQuery({
    queryKey: ["rides", search],
    queryFn: () => searchRides({ ...search }),
  });

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
            : `${rides?.length ?? 0} ride${rides?.length === 1 ? "" : "s"} heading your way`}
        </p>
        <span className="text-xs text-muted-foreground">Earliest first</span>
      </div>

      <div className="space-y-3">
        {rides?.map((ride) => <RideRow key={ride.id} ride={ride} />)}
        {!isLoading && (rides?.length ?? 0) === 0 && (
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

