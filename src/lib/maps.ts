/* Browser-side Google Maps helpers. Safe to import from SSR modules:
   nothing here touches window until a function is called. */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const google: any;
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }
}

export const MAPS_BROWSER_KEY = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] as
  | string
  | undefined;

const TRACKING_ID = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] as
  | string
  | undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let loader: Promise<any> | null = null;

/** Loads the Maps JavaScript API once and resolves with `google.maps`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadGoogleMaps(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser"));
  }
  if (loader) return loader;

  loader = new Promise((resolve, reject) => {
    if (!MAPS_BROWSER_KEY) {
      reject(new Error("Google Maps is not connected yet"));
      return;
    }
    if (window["google"]?.maps?.importLibrary) {
      resolve(window["google"].maps);
      return;
    }

    const callbackName = "__crosslineInitMaps";
    window[callbackName] = () => resolve(window["google"].maps);

    const params = new URLSearchParams({
      key: MAPS_BROWSER_KEY,
      libraries: "places,geometry",
      loading: "async",
      callback: callbackName,
      region: "CA",
      language: "en",
    });
    if (TRACKING_ID) params.set("channel", TRACKING_ID);

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onerror = () => reject(new Error("Could not load Google Maps"));
    document.head.appendChild(script);
  });

  return loader;
}

export type PlacePick = {
  address: string;
  placeId: string;
  lat: number;
  lng: number;
};

export function formatDistance(km: number | null | undefined) {
  if (km == null) return null;
  return `${Math.round(Number(km))} km`;
}

export function formatDuration(minutes: number | null | undefined) {
  if (minutes == null) return null;
  const total = Math.round(Number(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Cost-sharing guidance: roughly fuel + wear split across the car, per seat. */
export function suggestedFare(distanceKm: number) {
  const raw = distanceKm * 0.11;
  const rounded = Math.round(raw * 2) / 2;
  return Math.min(Math.max(rounded, 5), 250);
}
