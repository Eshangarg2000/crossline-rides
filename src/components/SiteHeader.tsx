import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyReviewAccess } from "@/lib/driver.functions";

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const fetchAccess = useServerFn(getMyReviewAccess);
  const { data: access } = useQuery({
    queryKey: ["review-access", user?.id],
    queryFn: () => fetchAccess(),
    enabled: Boolean(user),
  });

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
          <Link to="/rides" className="hover:text-foreground">
            Find a ride
          </Link>
          <Link to="/post-ride" className="hover:text-foreground">
            Post a ride
          </Link>
          <Link to="/my-trips" className="hover:text-foreground">
            My trips
          </Link>
          <Link to="/become-driver" className="hover:text-foreground">
            Become a driver
          </Link>
          {access?.isReviewer && (
            <Link to="/admin/drivers" className="hover:text-foreground">
              Reviews
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3 shrink-0 whitespace-nowrap">
          {user ? (
            <button
              onClick={async () => {
                await signOut();
                navigate({ to: "/" });
              }}
              className="text-sm text-muted-foreground hover:text-foreground"
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
            className="text-sm font-medium text-primary-foreground bg-primary hover:bg-primary-deep rounded-lg px-4 py-2"
          >
            Post a ride
          </Link>
        </div>
      </div>
    </header>
  );
}
