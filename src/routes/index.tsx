import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { RideSearchPanel } from "@/components/RideSearchPanel";
import { CORRIDORS } from "@/lib/rides";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Crossline — Where are you going?" },
      {
        name: "description",
        content:
          "Tell Crossline your pickup and destination. We find a seat in a vehicle already travelling your way — a 10 km commute or a 500 km trip.",
      },
      { property: "og:title", content: "Crossline — Where are you going?" },
      {
        property: "og:description",
        content:
          "Enter your pickup and destination. Crossline finds transportation already heading your direction.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-xl px-5 sm:px-8 pt-10 sm:pt-16 pb-16">
      <h1 className="font-display font-semibold text-foreground text-[32px] sm:text-[40px] leading-[1.1] tracking-tight">
        Where are you going?
      </h1>
      <p className="mt-3 text-[15px] text-muted-foreground">
        Crossline finds a seat in a vehicle already travelling your way.
      </p>

      <div className="mt-6">
        <RideSearchPanel
          onSearch={(v) =>
            navigate({
              to: "/rides",
              search: {
                from: v.from,
                to: v.to,
                date: v.date,
                seats: v.seats ?? 1,
                fromLat: v.fromLat,
                fromLng: v.fromLng,
                toLat: v.toLat,
                toLng: v.toLng,
                pickup: v.pickup,
              },
            })
          }
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {CORRIDORS.map((c) => (
          <Link
            key={`${c.from}-${c.to}`}
            to="/rides"
            search={{ from: c.from, to: c.to }}
            className="text-xs font-medium text-muted-foreground bg-background ring-1 ring-line rounded-full px-3 py-1.5"
          >
            {c.from.split(",")[0]} → {c.to.split(",")[0]}
          </Link>
        ))}
      </div>

      <section className="mt-14 border-t border-line pt-8">
        <ol className="space-y-5">
          {[
            ["Tell us your pickup and destination", "Use your current location or type an address."],
            ["See transportation heading your way", "Verified drivers and transportation providers, closest pickup first."],
            ["Book and pay in the app", "Your seat is held while you pay, in Canadian dollars."],
          ].map(([title, body], i) => (
            <li key={title} className="flex gap-4">
              <span className="mt-0.5 size-6 shrink-0 grid place-items-center rounded-full bg-background ring-1 ring-line text-xs font-semibold text-foreground">
                {i + 1}
              </span>
              <div>
                <p className="text-[15px] font-medium text-foreground">{title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10 border-t border-line pt-8">
        <p className="text-[15px] font-medium text-foreground">Driving somewhere anyway?</p>
        <p className="text-sm text-muted-foreground mt-1">
          Get verified, publish your route and fill the empty seats.
        </p>
        <Link
          to="/become-driver"
          className="inline-block mt-4 text-sm font-semibold text-foreground bg-background rounded-[12px] px-4 py-2.5 ring-1 ring-line"
        >
          Start driving
        </Link>
      </section>
    </div>
  );
}
