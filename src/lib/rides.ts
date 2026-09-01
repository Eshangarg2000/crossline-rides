import { supabase } from "@/integrations/supabase/client";

export type Ride = {
  id: string;
  driver_id: string;
  origin: string;
  destination: string;
  stops: string[];
  depart_at: string;
  arrive_at: string | null;
  seats_total: number;
  seats_available: number;
  price_per_seat: number;
  car: string | null;
  notes: string | null;
  status: string;
  origin_lat?: number | null;
  origin_lng?: number | null;
  destination_lat?: number | null;
  destination_lng?: number | null;
  distance_km?: number | string | null;
  duration_min?: number | null;
  route_polyline?: string | null;
  ride_kind?: string | null;
  pickup_flexibility?: string | null;
  max_detour_min?: number | null;
};



export type RideWithDriver = Ride & {
  driver: { full_name: string; rating: number; trips_count: number; city: string | null } | null;
};

export const CORRIDORS = [
  { from: "Toronto, ON", to: "Ottawa, ON" },
  { from: "Vancouver, BC", to: "Whistler, BC" },
  { from: "Toronto, ON", to: "Kingston, ON" },
  { from: "Mississauga, ON", to: "Hamilton, ON" },
];

export function money(amount: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" });
}

export function dayOf(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const UPPER_TOKENS = new Set([
  "ON","BC","AB","SK","MB","QC","NB","NS","PE","NL","YT","NT","NU",
  "NE","NW","SE","SW","GTA","YYZ","YVR","US","USA","UK",
]);

/** Display-only: normalise inconsistent address casing (e.g. "137 hORNER aVENUE"). */
export function formatPlace(value?: string | null) {
  if (!value) return "";
  return value
    .split(",")
    .map((segment) =>
      segment
        .trim()
        .split(/\s+/)
        .map((word) => {
          const bare = word.replace(/[^A-Za-z]/g, "");
          if (bare && UPPER_TOKENS.has(bare.toUpperCase()) && bare.length <= 3) {
            return word.toUpperCase();
          }
          if (/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(word)) return word.toUpperCase();
          if (/\d/.test(word) && /[A-Za-z]/.test(word) === false) return word;
          return word
            .split("-")
            .map((part) =>
              part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part,
            )
            .join("-");
        })
        .join(" "),
    )
    .filter(Boolean)
    .join(", ");
}

export function initials(name: string) {

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0]![0]! + (parts[1]?.[0] ?? "")).toUpperCase();
}

async function attachDrivers(rides: Ride[]): Promise<RideWithDriver[]> {
  if (rides.length === 0) return [];
  const ids = [...new Set(rides.map((r) => r.driver_id))];
  const { data } = await supabase.rpc("get_public_driver_profiles", { ids });
  const profiles = (data ?? []) as Array<{
    id: string;
    full_name: string | null;
    rating: number | string | null;
    trips_count: number | null;
    city: string | null;
  }>;

  const map = new Map(profiles.map((p) => [p.id, p]));
  return rides.map((r) => {
    const p = map.get(r.driver_id);
    return {
      ...r,
      driver: p
        ? {
            full_name: p.full_name || "Driver",
            rating: Number(p.rating),
            trips_count: p.trips_count ?? 0,
            city: p.city,
          }
        : null,
    };
  });
}

export async function searchRides(params: {
  from?: string | undefined;
  to?: string | undefined;
  date?: string | undefined;
  seats?: number | undefined;
}) {
  let query = supabase
    .from("rides")
    .select("*")
    .eq("status", "published")
    .gte("depart_at", new Date().toISOString())
    .order("depart_at", { ascending: true })
    .limit(50);

  if (params.from) query = query.ilike("origin", `%${params.from}%`);
  if (params.to) query = query.ilike("destination", `%${params.to}%`);
  if (params.seats) query = query.gte("seats_available", params.seats);
  if (params.date) {
    const start = new Date(`${params.date}T00:00:00`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    query = query.gte("depart_at", start.toISOString()).lt("depart_at", end.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;
  return attachDrivers((data ?? []) as unknown as Ride[]);
}

export async function getRide(id: string): Promise<RideWithDriver | null> {
  const { data, error } = await supabase.from("rides").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [ride] = await attachDrivers([data as unknown as Ride]);
  return ride ?? null;
}
