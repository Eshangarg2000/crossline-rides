const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

export type RouteInput = {
  origin: string;
  destination: string;
  stops?: string[];
};

export type RouteResult = {
  distanceKm: number;
  durationMin: number;
  polyline: string | null;
};

function credentials() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovableKey || !mapsKey) {
    throw new Error("Google Maps is not connected for this project yet");
  }
  return { lovableKey, mapsKey };
}

async function denied(response: Response): Promise<never> {
  const body = await response.text();
  if (response.status === 403) {
    throw new Error(
      "Google Maps denied this request (403). Check the Maps server key restrictions in Google Cloud Console.",
    );
  }
  console.error(`Google Maps gateway failed [${response.status}]: ${body}`);
  throw new Error(`Google Maps request failed [${response.status}]: ${body}`);
}

function waypoint(value: string) {
  return value.startsWith("place_id:")
    ? { placeId: value.slice("place_id:".length) }
    : { address: value };
}

export async function computeDrivingRoute(input: RouteInput): Promise<RouteResult> {
  const { lovableKey, mapsKey } = credentials();

  const response = await fetch(`${GATEWAY_URL}/routes/directions/v2:computeRoutes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": mapsKey,
      "Content-Type": "application/json",
      "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
    },
    body: JSON.stringify({
      origin: waypoint(input.origin),
      destination: waypoint(input.destination),
      intermediates: (input.stops ?? []).map(waypoint),
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_UNAWARE",
      regionCode: "CA",
      units: "METRIC",
    }),
  });

  if (!response.ok) await denied(response);

  const payload = (await response.json()) as {
    routes?: Array<{
      distanceMeters?: number;
      duration?: string;
      polyline?: { encodedPolyline?: string };
    }>;
  };

  const route = payload.routes?.[0];
  if (!route?.distanceMeters) {
    throw new Error("No driving route found between those points");
  }

  return {
    distanceKm: Math.round((route.distanceMeters / 1000) * 100) / 100,
    durationMin: Math.round(Number((route.duration ?? "0s").replace("s", "")) / 60),
    polyline: route.polyline?.encodedPolyline ?? null,
  };
}
