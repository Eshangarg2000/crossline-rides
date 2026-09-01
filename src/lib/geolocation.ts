/* Browser geolocation helper for rider pickup.
   Coordinates are held in component state / URL search only for the current
   search — nothing is persisted, and they are never rendered in the UI. */

export type Coords = { lat: number; lng: number };

export type LocationOutcome =
  | { ok: true; coords: Coords }
  | { ok: false; reason: "unsupported" | "denied" | "unavailable" };

export function requestCurrentPosition(timeoutMs = 10_000): Promise<LocationOutcome> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve({ ok: false, reason: "unsupported" });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          ok: true,
          coords: { lat: position.coords.latitude, lng: position.coords.longitude },
        }),
      (error) =>
        resolve({
          ok: false,
          reason: error.code === error.PERMISSION_DENIED ? "denied" : "unavailable",
        }),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}

export function locationErrorMessage(reason: "unsupported" | "denied" | "unavailable") {
  switch (reason) {
    case "denied":
      return "Location is turned off for Crossline. Enter your pickup instead.";
    case "unsupported":
      return "This device can't share its location. Enter your pickup instead.";
    default:
      return "We couldn't get your location. Enter your pickup instead.";
  }
}
