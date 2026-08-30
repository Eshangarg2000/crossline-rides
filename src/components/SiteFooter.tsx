export function SiteFooter() {
  return (
    <div className="bg-foreground text-background/70 mt-4">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid place-items-center size-8 rounded-lg bg-primary text-primary-foreground font-display font-semibold">
            C
          </span>
          <span className="font-display font-semibold text-background text-lg">Crossline</span>
        </div>
        <p className="text-xs">
          Carpooling for long-distance intercity travel · GTA &amp; BC · fares in CAD
        </p>
      </div>
    </div>
  );
}
