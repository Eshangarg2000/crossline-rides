import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/maps";

type Point = { lat: number; lng: number } | null;

export default function RouteMap({
  polyline,
  origin,
  destination,
  className = "w-full aspect-[16/8]",
}: {
  polyline: string | null;
  origin: Point;
  destination: Point;
  className?: string;
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
          fullscreenControl: true,
          gestureHandling: "cooperative",
        });

        const bounds = new maps.LatLngBounds();
        let start: Point = origin;
        let end: Point = destination;

        if (polyline) {
          const { encoding } = await maps.importLibrary("geometry");
          const path = encoding.decodePath(polyline);
          new maps.Polyline({
            path,
            map,
            strokeColor: "#B45F06",
            strokeOpacity: 0.95,
            strokeWeight: 5,
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          path.forEach((point: any) => bounds.extend(point));
          if (!start && path.length > 0) {
            start = { lat: path[0].lat(), lng: path[0].lng() };
          }
          if (!end && path.length > 0) {
            const last = path[path.length - 1];
            end = { lat: last.lat(), lng: last.lng() };
          }
        }

        if (start) {
          new maps.Marker({ position: start, map, title: "Pick up", label: "A" });
          bounds.extend(start);
        }
        if (end) {
          new maps.Marker({ position: end, map, title: "Drop off", label: "B" });
          bounds.extend(end);
        }

        if (!bounds.isEmpty()) map.fitBounds(bounds, 48);
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
      <div className={`${className} grid place-items-center bg-background text-sm text-muted-foreground`}>
        Route map unavailable
      </div>
    );
  }

  return <div ref={ref} className={className} aria-label="Map of the ride route" />;
}
