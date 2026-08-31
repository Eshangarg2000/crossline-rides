import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, MAPS_BROWSER_KEY, type PlacePick } from "@/lib/maps";

type Suggestion = { id: string; primary: string; secondary: string; raw: unknown };

export function PlaceInput({
  id,
  value,
  onChange,
  onPick,
  placeholder,
  required,
  className,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onPick: (place: PlacePick) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const sessionRef = useRef<unknown>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef(false);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (!MAPS_BROWSER_KEY) return;
    if (skipRef.current) {
      skipRef.current = false;
      return;
    }
    const input = value.trim();
    if (input.length < 3) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const maps = await loadGoogleMaps();
        const { AutocompleteSuggestion, AutocompleteSessionToken } = await maps.importLibrary("places");
        if (!sessionRef.current) sessionRef.current = new AutocompleteSessionToken();
        const { suggestions: results } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          sessionToken: sessionRef.current,
          includedRegionCodes: ["ca"],
        });
        if (cancelled) return;
        setSuggestions(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (results ?? []).slice(0, 5).map((s: any, i: number) => ({
            id: `${i}-${s.placePrediction?.placeId ?? i}`,
            primary: s.placePrediction?.mainText?.text ?? s.placePrediction?.text?.text ?? "",
            secondary: s.placePrediction?.secondaryText?.text ?? "",
            raw: s,
          })),
        );
        setOpen(true);
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value]);

  async function choose(suggestion: Suggestion) {
    setOpen(false);
    setSuggestions([]);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const place = (suggestion.raw as any).placePrediction.toPlace();
      await place.fetchFields({ fields: ["id", "formattedAddress", "location", "displayName"] });
      const address = place.formattedAddress ?? place.displayName ?? suggestion.primary;
      skipRef.current = true;
      onChange(address);
      sessionRef.current = null;
      onPick({
        address,
        placeId: place.id,
        lat: place.location?.lat?.() ?? 0,
        lng: place.location?.lng?.() ?? 0,
      });
    } catch {
      skipRef.current = true;
      onChange([suggestion.primary, suggestion.secondary].filter(Boolean).join(", "));
    }
  }

  return (
    <div className="relative" ref={boxRef}>
      <input
        id={id}
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-[12px] bg-card ring-1 ring-black/10 shadow-lg">
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => choose(s)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-background"
              >
                <span className="block text-sm text-foreground">{s.primary}</span>
                {s.secondary && (
                  <span className="block text-xs text-muted-foreground">{s.secondary}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
