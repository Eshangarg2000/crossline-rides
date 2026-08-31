import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RideRow } from "@/components/RideRow";
import { CORRIDORS, searchRides } from "@/lib/rides";
import highway from "@/assets/highway-merge.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Crossline — Carpool rides across the GTA & Vancouver" },
      {
        name: "description",
        content:
          "Drivers post their route, pickup and drop points. Riders book a seat and pay in app. Intercity carpooling for the GTA, Ontario and British Columbia.",
      },
      { property: "og:title", content: "Crossline — Carpool rides across the GTA & Vancouver" },
      {
        property: "og:description",
        content: "Post a route or book a seat on an intercity carpool. Fares in CAD, paid in app.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [seats, setSeats] = useState("1");

  const { data: rides, isLoading } = useQuery({
    queryKey: ["rides", "upcoming"],
    queryFn: () => searchRides({}),
  });

  const field =
    "w-full rounded-[12px] bg-card ring-1 ring-black/5 px-3.5 py-2.5 text-sm text-foreground outline-none focus:ring-primary";
  const label =
    "block text-sm font-medium text-foreground mb-1.5";

  return (
    <div>
      <div className="mx-auto max-w-6xl px-5 sm:px-8 pt-12 pb-14">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-primary-deep">
            Carpool across Canada
          </p>
          <h1 className="font-display font-semibold text-foreground mt-4 text-4xl sm:text-5xl leading-tight max-w-[18ch] text-balance">
            One shared lane, coast to coast.
          </h1>
          <p className="mt-5 text-base text-muted-foreground max-w-[52ch] text-pretty">
            Real drivers, real routes, fair CAD fares. Drivers post their pickup and drop points across the
            GTA and Metro Vancouver — riders book a seat and pay in app.
          </p>
        </div>

        <form
          className="mt-9 rounded-[20px] ring-1 ring-black/5 bg-sun/60 p-5 sm:p-6"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({
              to: "/rides",
              search: {
                from: from || undefined,
                to: to || undefined,
                date: date || undefined,
                seats: Number(seats) || 1,
              },
            });
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-2 items-end">
            <div className="sm:col-span-4">
              <label className={label} htmlFor="home-from">From</label>
              <input
                id="home-from"
                className={field}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="Toronto, ON"
              />
            </div>
            <div className="sm:col-span-4">
              <label className={label} htmlFor="home-to">To</label>
              <input
                id="home-to"
                className={field}
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="Ottawa, ON"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={label} htmlFor="home-date">Date</label>
              <input id="home-date" type="date" className={field} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={label} htmlFor="home-seats">Seats</label>
              <input
                id="home-seats"
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
                className="w-full rounded-[12px] bg-primary hover:bg-primary-deep text-primary-foreground text-sm font-semibold py-3"
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
              <Link
                key={`${c.from}-${c.to}`}
                to="/rides"
                search={{ from: c.from, to: c.to }}
                className="text-xs font-medium text-foreground bg-card ring-1 ring-line rounded-full px-3 py-1"
              >
                {c.from.split(",")[0]} → {c.to.split(",")[0]}
              </Link>
            ))}
          </div>
        </form>
      </div>

      <div className="mx-auto max-w-6xl px-5 sm:px-8 pb-14">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="font-display font-semibold text-foreground text-2xl">Upcoming departures</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isLoading ? "Loading rides…" : "Live rides posted by drivers across Ontario and BC"}
            </p>
          </div>
          <Link to="/rides" className="text-xs text-muted-foreground">
            See all
          </Link>
        </div>

        <div className="space-y-4">
          {rides?.slice(0, 3).map((ride) => <RideRow key={ride.id} ride={ride} />)}
          {!isLoading && (rides?.length ?? 0) === 0 && (
            <div className="rounded-[18px] ring-1 ring-black/5 bg-card p-8 text-center">
              <p className="font-display font-semibold text-foreground text-xl">No rides posted yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Be the first driver on the corridor — post your route and set a price per seat.
              </p>
              <Link
                to="/post-ride"
                className="inline-block mt-5 rounded-[12px] bg-primary hover:bg-primary-deep text-primary-foreground text-sm font-semibold px-5 py-3"
              >
                Post a ride
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 sm:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 rounded-[22px] ring-1 ring-black/5 bg-card overflow-hidden">
            <img
              src={highway}
              alt="Golden hour aerial view of a Canadian highway merging into one lane"
              width={1440}
              height={760}
              className="w-full aspect-[16/8] object-cover"
            />
            <div className="p-5 sm:p-7">
              <p className="text-sm font-medium text-primary-deep">How it works</p>
              <h3 className="font-display font-semibold text-foreground text-2xl mt-1.5">
                Two lanes, one ride
              </h3>
              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <span className="size-2.5 rounded-full bg-primary shrink-0" />
                  <span className="text-foreground font-medium">
                    Drivers post the route, pickup point and stops
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="size-2.5 rounded-full bg-foreground/40 shrink-0" />
                  <span className="text-muted-foreground">Riders search the corridor and pick a departure</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="size-2.5 rounded-full bg-foreground shrink-0" />
                  <span className="text-foreground font-medium">
                    Seat is paid in app and both sides get connected
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 rounded-[22px] ring-1 ring-black/5 bg-card p-5 sm:p-7">
            <p className="text-sm font-medium text-primary-deep">Drive with us</p>
            <h3 className="font-display font-semibold text-foreground text-2xl mt-1.5">Post a ride</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Add your route points and set a fair price per seat.
            </p>

            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-2 rounded-[12px] bg-background ring-1 ring-black/5 px-3.5 py-2.5 text-sm text-foreground">
                <span className="size-2 rounded-full bg-primary shrink-0" /> Pick up point
              </div>
              <div className="flex items-center gap-2 rounded-[12px] bg-background ring-1 ring-black/5 px-3.5 py-2.5 text-sm text-foreground">
                <span className="size-2 rounded-full bg-foreground/40 shrink-0" /> Stops along the way
              </div>
              <div className="flex items-center gap-2 rounded-[12px] bg-background ring-1 ring-black/5 px-3.5 py-2.5 text-sm text-foreground">
                <span className="size-2 rounded-full bg-foreground shrink-0" /> Destination
              </div>
            </div>

            <Link
              to="/post-ride"
              className="mt-5 block w-full rounded-[12px] bg-primary hover:bg-primary-deep text-primary-foreground text-sm font-semibold py-3 text-center"
            >
              Publish ride
            </Link>
            <p className="mt-3 text-xs text-muted-foreground">
              GTA, Ontario corridors and Metro Vancouver · fares in CAD
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
