import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/maps";

export default function RouteMap({
  polyline,
  origin,
  destination,
}: {
  polyline: string | null;
  origin: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const maps = await loadGoogleMaps();
        if (cancelled || !ref.current) return;

        const map = new maps.Map(ref.current, {
          zoom: 7,
          center: origin ?? { lat: 43.65, lng: -79.38 },
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "cooperative",
        });

        const bounds = new maps.LatLngBounds();

        if (polyline) {
          const { encoding } = await maps.importLibrary("geometry");
          const path = encoding.decodePath(polyline);
          new maps.Polyline({
            path,
            map,
            strokeColor: "#C9761B",
            strokeOpacity: 0.95,
            strokeWeight: 4,
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          path.forEach((point: any) => bounds.extend(point));
        }

        if (origin) {
          new maps.Marker({ position: origin, map, title: "Pick up" });
          bounds.extend(origin);
        }
        if (destination) {
          new maps.Marker({ position: destination, map, title: "Drop off" });
          bounds.extend(destination);
        }

        if (!bounds.isEmpty()) map.fitBounds(bounds, 40);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [polyline, origin, destination]);

  if (failed) {
    return (
      <div className="w-full aspect-[16/8] grid place-items-center bg-background text-sm text-muted-foreground">
        Route map unavailable
      </div>
    );
  }

  return <div ref={ref} className="w-full aspect-[16/8]" aria-label="Route map" />;
}
