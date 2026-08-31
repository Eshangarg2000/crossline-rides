import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  decideDriverApplication,
  getDriverDocumentUrl,
  getMyReviewAccess,
  listDriverApplications,
} from "@/lib/driver.functions";
import { evaluateApplication } from "@/lib/driver-rules";
import { DOCUMENTS } from "@/lib/driver";

export const Route = createFileRoute("/admin/drivers")({
  head: () => ({
    meta: [
      { title: "Driver reviews — Crossline admin" },
      { name: "description", content: "Review, approve or reject Crossline driver applications." },
      { property: "og:title", content: "Driver reviews — Crossline admin" },
      { property: "og:description", content: "Internal review queue for driver verification." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDrivers,
});

const badge: Record<string, string> = {
  approved: "bg-primary/15 text-primary-deep",
  submitted: "bg-amber-500/15 text-amber-700",
  rejected: "bg-destructive/10 text-destructive",
  draft: "bg-muted text-muted-foreground",
};

function AdminDrivers() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const fetchAccess = useServerFn(getMyReviewAccess);
  const fetchApps = useServerFn(listDriverApplications);
  const decide = useServerFn(decideDriverApplication);
  const signDoc = useServerFn(getDriverDocumentUrl);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const { data: access, isLoading: accessLoading } = useQuery({
    queryKey: ["review-access", user?.id],
    queryFn: () => fetchAccess(),
    enabled: Boolean(user),
  });

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ["driver-applications-admin"],
    queryFn: () => fetchApps(),
    enabled: Boolean(access?.isReviewer),
  });

  async function openDoc(path: string) {
    try {
      const { url } = await signDoc({ data: { path } });
      if (url) window.open(url, "_blank", "noopener");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open document");
    }
  }

  async function act(id: string, decision: "approved" | "rejected") {
    setBusy(id);
    try {
      await decide({ data: { id, decision, notes: notes[id] ?? "" } });
      toast.success(decision === "approved" ? "Driver approved" : "Application rejected");
      await queryClient.invalidateQueries({ queryKey: ["driver-applications-admin"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the decision");
    } finally {
      setBusy(null);
    }
  }

  if (loading || accessLoading) {
    return <div className="mx-auto max-w-5xl px-5 sm:px-8 py-16 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!user || !access?.isReviewer) {
    return (
      <div className="mx-auto max-w-2xl px-5 sm:px-8 py-20">
        <h1 className="font-display font-semibold text-foreground text-2xl">Reviewers only</h1>
        <p className="text-sm text-muted-foreground mt-2">
          This page is limited to Crossline admins and reviewers.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 sm:px-8 pt-10 pb-20">
      <p className="text-sm font-medium text-primary-deep">Admin</p>
      <h1 className="font-display font-semibold text-foreground text-3xl mt-2">Driver reviews</h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-[62ch]">
        Applications are screened automatically on submit. Anything that fails a hard rule is
        rejected instantly; the rest land here for a human decision.
      </p>

      {isLoading && <p className="text-sm text-muted-foreground mt-8">Loading applications…</p>}
      {!isLoading && apps.length === 0 && (
        <p className="text-sm text-muted-foreground mt-8">No applications yet.</p>
      )}

      <div className="mt-7 space-y-4">
        {apps.map((app) => {
          const result = evaluateApplication(app);
          const status = String(app["status"] ?? "draft");
          return (
            <div key={String(app["id"])} className="rounded-[20px] ring-1 ring-black/5 bg-card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display font-semibold text-foreground text-lg">
                    {String(app["legal_name"] ?? "Unnamed applicant")}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {String(app["city"] ?? "—")}, {String(app["province"] ?? "—")} ·{" "}
                    {String(app["vehicle_year"] ?? "—")} {String(app["vehicle_make"] ?? "")}{" "}
                    {String(app["vehicle_model"] ?? "")}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${badge[status] ?? badge["draft"]}`}
                >
                  {status} {app["decision_source"] === "auto" ? "· auto" : ""}
                </span>
              </div>

              <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Licence</dt>
                  <dd className="text-foreground">
                    {String(app["licence_class"] ?? "—")} · exp {String(app["licence_expiry"] ?? "—")}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Insurance</dt>
                  <dd className="text-foreground">
                    {String(app["insurance_company"] ?? "—")} · exp{" "}
                    {String(app["insurance_expiry"] ?? "—")}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Plate</dt>
                  <dd className="text-foreground">{String(app["plate_number"] ?? "—")}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Submitted</dt>
                  <dd className="text-foreground">
                    {app["submitted_at"] ? new Date(String(app["submitted_at"])).toLocaleDateString("en-CA") : "—"}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                {DOCUMENTS.map((doc) =>
                  app[doc.key] ? (
                    <button
                      key={doc.key}
                      type="button"
                      onClick={() => openDoc(String(app[doc.key]))}
                      className="rounded-full bg-background ring-1 ring-line px-3 py-1 text-xs font-medium text-primary-deep"
                    >
                      {doc.label}
                    </button>
                  ) : null,
                )}
              </div>

              {(result.failures.length > 0 || result.warnings.length > 0) && (
                <ul className="mt-4 space-y-1 text-sm">
                  {result.failures.map((f) => (
                    <li key={f} className="text-destructive">· {f}</li>
                  ))}
                  {result.warnings.map((w) => (
                    <li key={w} className="text-amber-700">· {w}</li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <input
                  className="flex-1 rounded-[12px] bg-background ring-1 ring-black/5 px-3.5 py-2.5 text-sm text-foreground outline-none focus:ring-primary"
                  placeholder="Note for the driver (optional)"
                  value={notes[String(app["id"])] ?? ""}
                  onChange={(e) =>
                    setNotes((prev) => ({ ...prev, [String(app["id"])]: e.target.value }))
                  }
                  aria-label="Reviewer note"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy === String(app["id"])}
                    onClick={() => act(String(app["id"]), "approved")}
                    className="rounded-[12px] bg-primary hover:bg-primary-deep text-primary-foreground text-sm font-semibold px-4 py-2.5 disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busy === String(app["id"])}
                    onClick={() => act(String(app["id"]), "rejected")}
                    className="rounded-[12px] bg-background ring-1 ring-line text-destructive text-sm font-semibold px-4 py-2.5 disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
