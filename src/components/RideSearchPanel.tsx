import { useState } from "react";
import { PlaceInput } from "@/components/PlaceInput";
import { ArrowRight, Circle, LocateFixed, Loader2, MapPin, Minus, Plus } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { reverseGeocode } from "@/lib/maps.functions";
import { locationErrorMessage, requestCurrentPosition } from "@/lib/geolocation";

export type PickupPreference = "closest" | "meeting" | "flexible";

export type RideSearchValues = {
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

const PREFERENCES: Array<{ value: PickupPreference; label: string; hint: string }> = [
  { value: "closest", label: "Closest pickup", hint: "Pick me up near my location" },
  { value: "meeting", label: "Meeting point", hint: "I can meet nearby" },
  { value: "flexible", label: "Flexible", hint: "I'll travel a little farther" },
];

/**
 * The one thing Crossline asks: where are you going?
 * Pickup (or current location), destination, when, passengers — one button.
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
  const [seats, setSeats] = useState(Math.min(8, Math.max(1, initial?.seats ?? 1)));
  const [pickup, setPickup] = useState<PickupPreference>(initial?.pickup ?? "meeting");
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [fromPoint, setFromPoint] = useState<{ lat: number; lng: number } | null>(
    initial?.fromLat != null && initial?.fromLng != null
      ? { lat: initial.fromLat, lng: initial.fromLng }
      : null,
  );
  const [toPoint, setToPoint] = useState<{ lat: number; lng: number } | null>(
    initial?.toLat != null && initial?.toLng != null
      ? { lat: initial.toLat, lng: initial.toLng }
      : null,
  );

  const lookupAddress = useServerFn(reverseGeocode);

  async function useMyLocation() {
    setLocating(true);
    setLocationNote(null);
    const result = await requestCurrentPosition();
    if (!result.ok) {
      setLocating(false);
      setLocationNote(locationErrorMessage(result.reason));
      return;
    }

    // Coordinates already make the search work; the address is only a label.
    setFromPoint(result.coords);
    setFrom("Current location");
    try {
      const geo = await lookupAddress({ data: result.coords });
      if (geo?.address) setFrom(geo.address);
    } catch {
      setLocationNote("Using your current location.");
    } finally {
      setLocating(false);
    }
  }

  const input =
    "w-full bg-transparent text-[16px] text-foreground placeholder:text-muted-foreground outline-none";

  return (
    <form
      className="rounded-[22px] bg-card ring-1 ring-black/5 shadow-[0_10px_40px_-24px_rgba(0,0,0,0.45)] p-3 sm:p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch({
          from: from || undefined,
          to: to || undefined,
          date: date || undefined,
          seats,
          fromLat: fromPoint?.lat,
          fromLng: fromPoint?.lng,
          toLat: toPoint?.lat,
          toLng: toPoint?.lng,
          pickup,
        });
      }}
    >
      <div className="rounded-[16px] bg-background ring-1 ring-black/5 divide-y divide-line">
        <div className="flex items-center gap-3 px-4 py-4">
          <Circle className="size-3.5 text-primary shrink-0" strokeWidth={3} />
          <PlaceInput
            id="search-from"
            aria-label="Pickup location"
            className={input}
            value={from}
            onChange={(v) => {
              setFrom(v);
              setFromPoint(null);
            }}
            onPick={(p) => {
              setFrom(p.address);
              setFromPoint({ lat: p.lat, lng: p.lng });
            }}
            placeholder="Pickup location"
          />
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            aria-label="Use my current location"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-card ring-1 ring-line px-3 py-2 text-xs font-semibold text-foreground disabled:opacity-60"
          >
            {locating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <LocateFixed className="size-3.5" />
            )}
            <span className="hidden xs:inline sm:inline">Current</span>
          </button>
        </div>
        <div className="flex items-center gap-3 px-4 py-4">
          <MapPin className="size-4 text-foreground shrink-0" />
          <PlaceInput
            id="search-to"
            aria-label="Where are you going?"
            className={input}
            value={to}
            onChange={(v) => {
              setTo(v);
              setToPoint(null);
            }}
            onPick={(p) => {
              setTo(p.address);
              setToPoint({ lat: p.lat, lng: p.lng });
            }}
            placeholder="Where are you going?"
          />
        </div>
      </div>

      {locationNote && <p className="mt-2 px-1 text-xs text-muted-foreground">{locationNote}</p>}

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-[14px] bg-background ring-1 ring-black/5 px-4 py-2.5">
          <span className="block text-[11px] font-medium text-muted-foreground">When</span>
          {date ? (
            <div className="flex items-center gap-2">
              <input
                id="search-date"
                type="date"
                aria-label="Departure date"
                className={input}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setDate("")}
                className="text-xs text-muted-foreground shrink-0"
              >
                Clear
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setDate(new Date().toISOString().slice(0, 10))}
              className="text-[16px] text-foreground text-left w-full py-0.5"
            >
              Today <span className="text-muted-foreground text-sm">· choose date</span>
            </button>
          )}
        </div>

        <div className="rounded-[14px] bg-background ring-1 ring-black/5 px-4 py-2.5">
          <span className="block text-[11px] font-medium text-muted-foreground">Passengers</span>
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Fewer passengers"
              onClick={() => setSeats((s) => Math.max(1, s - 1))}
              className="size-7 grid place-items-center rounded-full ring-1 ring-line text-foreground"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="text-[16px] font-medium text-foreground">{seats}</span>
            <button
              type="button"
              aria-label="More passengers"
              onClick={() => setSeats((s) => Math.min(8, s + 1))}
              className="size-7 grid place-items-center rounded-full ring-1 ring-line text-foreground"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      <fieldset className="mt-3">
        <legend className="sr-only">How would you like to be picked up?</legend>
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {PREFERENCES.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPickup(p.value)}
              aria-pressed={pickup === p.value}
              title={p.hint}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-medium ring-1 transition ${
                pickup === p.value
                  ? "bg-foreground text-background ring-transparent"
                  : "bg-background text-muted-foreground ring-line"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-[14px] bg-primary hover:bg-primary-deep text-primary-foreground text-[16px] font-semibold py-4"
      >
        {submitLabel}
        <ArrowRight className="size-4" />
      </button>
    </form>
  );
}
