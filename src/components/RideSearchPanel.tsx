import { useState } from "react";
import { PlaceInput } from "@/components/PlaceInput";
import { ArrowRight, Circle, MapPin } from "lucide-react";

export type RideSearchValues = {
  from?: string | undefined;
  to?: string | undefined;
  date?: string | undefined;
  seats?: number | undefined;
};

/**
 * Primary passenger action: "Where are you going?"
 * One card, four inputs, one button — same panel on the home screen and search page.
 */
export function RideSearchPanel({
  initial,
  onSearch,
  submitLabel = "Find a ride",
}: {
  initial?: RideSearchValues;
  onSearch: (values: RideSearchValues) => void;
  submitLabel?: string;
}) {
  const [from, setFrom] = useState(initial?.from ?? "");
  const [to, setTo] = useState(initial?.to ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [seats, setSeats] = useState(String(initial?.seats ?? 1));

  const input =
    "w-full bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground outline-none";

  return (
    <form
      className="rounded-[22px] bg-card ring-1 ring-black/5 shadow-[0_10px_40px_-24px_rgba(0,0,0,0.45)] p-3 sm:p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch({
          from: from || undefined,
          to: to || undefined,
          date: date || undefined,
          seats: Number(seats) || 1,
        });
      }}
    >
      <div className="rounded-[16px] bg-background ring-1 ring-black/5 divide-y divide-line">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <Circle className="size-3.5 text-primary shrink-0" strokeWidth={3} />
          <PlaceInput
            id="search-from"
            aria-label="Pickup location"
            className={input}
            value={from}
            onChange={setFrom}
            onPick={(p) => setFrom(p.address)}
            placeholder="Pickup location"
          />
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <MapPin className="size-4 text-foreground shrink-0" />
          <PlaceInput
            id="search-to"
            aria-label="Where are you going?"
            className={input}
            value={to}
            onChange={setTo}
            onPick={(p) => setTo(p.address)}
            placeholder="Where are you going?"
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="rounded-[14px] bg-background ring-1 ring-black/5 px-4 py-2.5 block">
          <span className="block text-[11px] font-medium text-muted-foreground">When</span>
          <input
            type="date"
            className={input}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="rounded-[14px] bg-background ring-1 ring-black/5 px-4 py-2.5 block">
          <span className="block text-[11px] font-medium text-muted-foreground">Passengers</span>
          <input
            type="number"
            min={1}
            max={8}
            className={input}
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
          />
        </label>
      </div>

      <button
        type="submit"
        className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-[14px] bg-primary hover:bg-primary-deep text-primary-foreground text-[15px] font-semibold py-3.5"
      >
        {submitLabel}
        <ArrowRight className="size-4" />
      </button>
    </form>
  );
}
