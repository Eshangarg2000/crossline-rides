import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyReviewAccess } from "@/lib/driver.functions";

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const fetchAccess = useServerFn(getMyReviewAccess);
  const { data: access } = useQuery({
    queryKey: ["review-access", user?.id],
    queryFn: () => fetchAccess(),
    enabled: Boolean(user),
  });

  const links = [
    { to: "/rides", label: "Find a ride" },
    { to: "/post-ride", label: "Post a ride" },
    { to: "/my-trips", label: "My trips" },
    { to: "/become-driver", label: "Become a driver" },
    ...(access?.isReviewer ? [{ to: "/admin/drivers", label: "Reviews" }] : []),
  ] as const;

  return (
    <header className="mx-auto max-w-6xl px-5 sm:px-8 pt-6">
      <div className="flex items-center justify-between gap-4 lg:gap-8">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <span className="grid place-items-center size-9 rounded-lg bg-primary text-primary-foreground font-display font-semibold text-lg">
            C
          </span>
          <span className="font-display font-semibold text-foreground text-xl tracking-tight">
            Crossline
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-6 xl:gap-7 text-sm text-muted-foreground whitespace-nowrap">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0 whitespace-nowrap">
          {user ? (
            <button
              onClick={async () => {
                await signOut();
                navigate({ to: "/" });
              }}
              className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground"
            >
              Sign out
            </button>
          ) : (
            <Link to="/auth" className="text-sm text-muted-foreground hidden sm:inline hover:text-foreground">
              Sign in
            </Link>
          )}
          <Link
            to="/post-ride"
            className="hidden sm:inline text-sm font-medium text-primary-foreground bg-primary hover:bg-primary-deep rounded-lg px-4 py-2"
          >
            Post a ride
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden grid place-items-center size-9 rounded-lg ring-1 ring-line bg-card text-foreground"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="lg:hidden mt-4 rounded-[16px] ring-1 ring-black/5 bg-card p-3 flex flex-col text-sm">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="px-3 py-2.5 rounded-lg text-foreground hover:bg-sun"
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-1 pt-2 border-t border-line">
            {user ? (
              <button
                onClick={async () => {
                  setOpen(false);
                  await signOut();
                  navigate({ to: "/" });
                }}
                className="w-full text-left px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-sun"
              >
                Sign out
              </button>
            ) : (
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-sun"
              >
                Sign in
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
