# Crossline pre-launch hardening

Findings from inspecting the current app, database, policies, storage and Stripe flow — plus the fix plan. Nothing is rebuilt; the design, search, maps and onboarding stay as they are.

## What the audit found

Confirmed safe today:
- Driver documents live in a private bucket with per-user folder rules; only the owner and admins/reviewers can read them, and admin review uses short-lived signed links.
- Prices, service fee and payout are already calculated on the server during checkout.
- Phone numbers are no longer reachable publicly; public driver info goes through a restricted lookup.
- No server secrets are in frontend code or committed env files (only publishable keys).

Real problems that block taking real money:
1. **Anyone signed in can insert a booking directly** with their own price, service fee and even `payment_status: 'paid'` — bypassing checkout entirely. The database currently accepts it.
2. **Anyone signed in can publish a ride**, approved driver or not. The "get verified first" gate is UI-only.
3. **Seats are consumed the moment checkout starts** and never released if payment fails, expires or is abandoned. Abandoned checkouts permanently destroy inventory.
4. **Stripe webhooks are not idempotent** — a retried event re-runs the update. There is no record of processed event IDs.
5. **No duplicate-booking protection** — double click or refresh creates two pending bookings and two seat reservations.
6. **No cancellation path at all** — riders cannot cancel, drivers can hard-delete a ride that has paid bookings, destroying financial history.
7. **Stripe live/test mode is decided in the browser** from a client token.
8. **No ride lifecycle** — past rides stay "published" forever; nothing ever completes, so trip counts and future reviews have no source of truth.
9. **No audit trail** for approvals, cancellations or refunds.

## What I will build

### Database (one migration)
- **Bookings state model**: `payment_status` (pending/paid/failed/refunded/expired) kept separate from `status` (pending_payment / confirmed / cancelled / completed). Default is never confirmed. Add `hold_expires_at`, `cancelled_at`, `cancellation_reason`, `refund_amount`, `idempotency_key` (unique per rider+ride+pending).
- **Remove direct client writes to bookings.** All booking creation, cancellation and state change moves to security-definer functions; riders keep read access to their own bookings only.
- **Atomic seat functions**: `reserve_seats` / `release_seats` with row locking, guarded against negative seats, overbooking and double release.
- **Hold expiry**: pending bookings past `hold_expires_at` release their seats exactly once (sweeper function, called on ride reads and by webhook events).
- **Ride insert/update gated on driver approval** at the policy level, via an `is_approved_driver()` check.
- **Ride deletion blocked** when bookings exist; `status` gains `cancelled` and `completed`, plus `cancelled_at`/`cancellation_reason`.
- **New tables**: `stripe_events` (processed event IDs, for idempotency), `audit_log` (actor, action, entity, metadata), `notifications` (user, type, payload, read state).
- **Extensibility columns, unused for now** so the future work doesn't need a rewrite: rides get `pickup_flexibility` (on-route / 5 min / 10 min), `max_detour_min`, `ride_kind` (cost_share / commercial), `recurrence` (jsonb); bookings get `pickup_request`, `dropoff_request`, `pickup_point`, `estimated_detour_min`.
- Grants + RLS for every new table, admin-only reads on audit log, owner-only on notifications.

### Server functions
- `createRideCheckoutSession` reworked: idempotent (reuses an open session for the same rider+ride), places a timed seat hold, environment chosen server-side from deployment config instead of the browser.
- Webhook: dedupe on Stripe event ID, confirm booking once, release seats once on failure/expiry, record tax and totals.
- `cancelBooking` (rider): server-side refund policy, Stripe refund when paid, seats released exactly once, booking cancelled, notification + audit entry.
- `cancelRide` (driver): soft cancel, refunds every paid booking, notifies riders, writes audit entries. Delete route removed from the UI.
- `completeRides`: marks departed rides completed and bumps trip counts, so the lifecycle terminates.
- Ride publishing re-validates driver approval server-side.

### UI (minimal, same look)
- "Cancel booking" on My trips with refund preview and confirmation.
- "Cancel ride" replacing delete for drivers, with a warning when riders are booked.
- Booking status badges reflecting the real state machine (awaiting payment / confirmed / cancelled / completed).
- Better payment error, empty and network-failure states on the checkout and trips screens.

### Verification
Automated checks against the live database as an ordinary user: attempt a direct booking insert with a forged price, publish a ride as an unapproved driver, book the last seat twice concurrently, replay a webhook, and cancel a paid booking. Results go into the final report.

## Out of scope for this pass
Recurring rides, route-corridor matching, detour calculation, driver payouts via Stripe Connect, and email/push delivery are prepared for in the schema but not implemented — I will not claim otherwise. The report will list them alongside the manual Stripe/domain/Maps configuration and the legal/insurance items that need Canadian professional review.
