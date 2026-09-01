import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RideRow } from "@/components/RideRow";
import { RideSearchPanel } from "@/components/RideSearchPanel";
import { CORRIDORS, searchRides } from "@/lib/rides";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Crossline — Tell us where you're going" },
      {
        name: "description",
        content:
          "Crossline connects riders with empty seats in vehicles already heading their way — local commutes across the GTA and Metro Vancouver, or long-distance trips across Canada.",
      },
      { property: "og:title", content: "Crossline — Tell us where you're going" },
      {
        property: "og:description",
        content:
          "Enter your pickup and destination. Crossline finds a seat in a vehicle already travelling your direction.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();

  const { data: rides, isLoading } = useQuery({
    queryKey: ["rides", "upcoming"],
    queryFn: () => searchRides({}),
  });

  return (
    <div className="mx-auto max-w-2xl px-5 sm:px-8 pt-10 pb-16">
      <h1 className="font-display font-semibold text-foreground text-3xl sm:text-4xl leading-tight">
        Where are you going?
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We&apos;ll find a seat in a vehicle already heading your way.
      </p>

      <div className="mt-6">
        <RideSearchPanel
          onSearch={(v) =>
            navigate({
              to: "/rides",
              search: { from: v.from, to: v.to, date: v.date, seats: v.seats ?? 1 },
            })
          }
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {CORRIDORS.map((c) => (
          <Link
            key={`${c.from}-${c.to}`}
            to="/rides"
            search={{ from: c.from, to: c.to }}
            className="text-xs font-medium text-foreground bg-card ring-1 ring-line rounded-full px-3 py-1.5"
          >
            {c.from.split(",")[0]} → {c.to.split(",")[0]}
          </Link>
        ))}
      </div>

      <section className="mt-10">
        <div className="flex items-end justify-between mb-4">
          <h2 className="font-display font-semibold text-foreground text-xl">Leaving soon</h2>
          <Link to="/rides" search={{}} className="text-xs text-muted-foreground">
            See all
          </Link>
        </div>

        <div className="space-y-3">
          {rides?.slice(0, 4).map((ride) => <RideRow key={ride.id} ride={ride} />)}
          {isLoading && <p className="text-sm text-muted-foreground">Finding rides…</p>}
          {!isLoading && (rides?.length ?? 0) === 0 && (
            <div className="rounded-[18px] ring-1 ring-black/5 bg-card p-6 text-center">
              <p className="font-medium text-foreground">No trips posted yet</p>
              <p className="text-sm text-muted-foreground mt-1.5">
                Driving somewhere with a spare seat? Share the trip and cover your costs.
              </p>
              <Link
                to="/post-ride"
                className="inline-block mt-4 rounded-[12px] bg-primary hover:bg-primary-deep text-primary-foreground text-sm font-semibold px-5 py-2.5"
              >
                Offer a ride
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="mt-10 rounded-[18px] bg-card ring-1 ring-black/5 p-5">
        <p className="text-sm font-medium text-foreground">Driving anyway?</p>
        <p className="text-sm text-muted-foreground mt-1.5">
          Get verified, publish your route and fill the empty seats — commute or cross-country.
        </p>
        <Link
          to="/become-driver"
          className="inline-block mt-4 text-sm font-medium text-foreground bg-background rounded-lg px-4 py-2 ring-1 ring-line"
        >
          Start driving
        </Link>
      </section>
    </div>
  );
}

