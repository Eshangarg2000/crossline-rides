import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useServerFn } from "@tanstack/react-start";
import { submitDriverApplication } from "@/lib/driver.functions";
import {
  DOCUMENTS,
  PROVINCES,
  getMyDriverApplication,
  statusCopy,
  uploadDriverDocument,
  type DocumentKey,
  type DriverApplication,
} from "@/lib/driver";

export const Route = createFileRoute("/become-driver")({
  head: () => ({
    meta: [
      { title: "Become a Crossline driver — verification & documents" },
      {
        name: "description",
        content:
          "Apply to drive with Crossline. Submit your Canadian driver's licence, vehicle registration, insurance and driving abstract for verification before posting rides.",
      },
      { property: "og:title", content: "Become a Crossline driver" },
      {
        property: "og:description",
        content: "Licence, insurance and vehicle verification for carpool drivers in Ontario and BC.",
      },
    ],
  }),
  component: BecomeDriver,
});

type Form = Record<string, string>;

const EMPTY: Form = {
  legal_name: "",
  date_of_birth: "",
  phone: "",
  street_address: "",
  city: "",
  province: "ON",
  postal_code: "",
  licence_number: "",
  licence_province: "ON",
  licence_class: "G",
  licence_expiry: "",
  vehicle_make: "",
  vehicle_model: "",
  vehicle_year: "",
  vehicle_colour: "",
  plate_number: "",
  plate_province: "ON",
  insurance_company: "",
  insurance_policy_number: "",
  insurance_expiry: "",
};

const field =
  "w-full rounded-[12px] bg-background ring-1 ring-black/5 px-3.5 py-2.5 text-sm text-foreground outline-none focus:ring-primary";
const labelClass = "block text-sm font-medium text-foreground mb-1.5";
const sectionTitle = "font-display font-semibold text-foreground text-xl";

function BecomeDriver() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const runSubmit = useServerFn(submitDriverApplication);

  const [form, setForm] = useState<Form>(EMPTY);
  const [docs, setDocs] = useState<Partial<Record<DocumentKey, string>>>({});
  const [uploading, setUploading] = useState<DocumentKey | null>(null);
  const [consents, setConsents] = useState({ background: false, terms: false, accurate: false });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data: application, refetch } = useQuery({
    queryKey: ["driver-application", user?.id],
    queryFn: getMyDriverApplication,
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!application) return;
    const next: Form = { ...EMPTY };
    for (const key of Object.keys(EMPTY)) {
      const value = (application as unknown as Record<string, unknown>)[key];
      next[key] = value == null ? EMPTY[key]! : String(value);
    }
    setForm(next);
    const nextDocs: Partial<Record<DocumentKey, string>> = {};
    for (const doc of DOCUMENTS) {
      const path = (application as unknown as Record<string, string | null>)[doc.key];
      if (path) nextDocs[doc.key] = path;
    }
    setDocs(nextDocs);
    setConsents({
      background: application.consent_background_check,
      terms: application.consent_terms,
      accurate: application.consent_accurate,
    });
  }, [application]);

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function pickFile(key: DocumentKey, file: File | undefined) {
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Files must be under 10 MB");
      return;
    }
    setUploading(key);
    try {
      const path = await uploadDriverDocument(user.id, key, file);
      setDocs((prev) => ({ ...prev, [key]: path }));
      toast.success("Document uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  function ageOk(dob: string) {
    if (!dob) return false;
    const birth = new Date(dob);
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 19);
    return birth <= cutoff;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    if (!ageOk(form["date_of_birth"] ?? "")) {
      toast.error("Drivers must be at least 19 years old");
      return;
    }
    const missing = DOCUMENTS.filter((d) => d.required && !docs[d.key]);
    if (missing.length > 0) {
      toast.error(`Please upload: ${missing.map((d) => d.label).join(", ")}`);
      return;
    }
    if (!consents.background || !consents.terms || !consents.accurate) {
      toast.error("Please accept all three declarations");
      return;
    }

    setBusy(true);
    try {
      const result = await runSubmit({
        data: {
          ...form,
          vehicle_year: form["vehicle_year"] ? Number(form["vehicle_year"]) : null,
          licence_front_path: docs.licence_front_path ?? null,
          licence_back_path: docs.licence_back_path ?? null,
          insurance_path: docs.insurance_path ?? null,
          registration_path: docs.registration_path ?? null,
          abstract_path: docs.abstract_path ?? null,
          consent_background_check: consents.background,
          consent_terms: consents.terms,
          consent_accurate: consents.accurate,
        },
      });

      if (result.status === "approved") toast.success("Approved — you can post rides now");
      else if (result.status === "rejected")
        toast.error(result.reason ?? "Your application did not meet the requirements");
      else toast.success("Submitted — a reviewer will take a look");

      await refetch();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit your application");
    } finally {
      setBusy(false);
    }
  }


  const status = (application?.status ?? "draft") as DriverApplication["status"];
  const copy = statusCopy(status);
  const locked = status === "approved";

  return (
    <div className="mx-auto max-w-3xl px-5 sm:px-8 pt-10 pb-20">
      <p className="text-sm font-medium text-primary-deep">Drive with Crossline</p>
      <h1 className="font-display font-semibold text-foreground text-3xl mt-2">
        Driver verification
      </h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-[62ch]">
        Canadian ride-sharing rules require every driver to be identified, licensed, insured and
        driving a roadworthy vehicle. Complete the steps below once — after approval you can publish
        rides any time.
      </p>

      {application && (
        <div className="mt-6 rounded-[16px] ring-1 ring-black/5 bg-card p-5">
          <p className="text-sm font-semibold text-foreground">Status: {copy.title}</p>
          <p className="text-sm text-muted-foreground mt-1">{copy.body}</p>
          {application.review_notes && (
            <p className="text-sm text-destructive mt-2">{application.review_notes}</p>
          )}
          {locked && (
            <Link
              to="/post-ride"
              className="inline-block mt-4 rounded-[12px] bg-primary hover:bg-primary-deep text-primary-foreground text-sm font-semibold px-5 py-2.5"
            >
              Post a ride
            </Link>
          )}
        </div>
      )}

      <form onSubmit={submit} className="mt-7 space-y-5">
        <fieldset disabled={locked} className="space-y-5 disabled:opacity-70">
          <section className="rounded-[20px] ring-1 ring-black/5 bg-card p-5 sm:p-6">
            <h2 className={sectionTitle}>1. Your identity</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Use your full legal name exactly as it appears on your licence. Drivers must be 19 or
              older.
            </p>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="legal-name">Full legal name</label>
                <input
                  id="legal-name"
                  className={field}
                  value={form["legal_name"] ?? ""}
                  onChange={(e) => set("legal_name", e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="dob">Date of birth</label>
                <input
                  id="dob"
                  type="date"
                  className={field}
                  value={form["date_of_birth"] ?? ""}
                  onChange={(e) => set("date_of_birth", e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="phone">Mobile phone</label>
                <input
                  id="phone"
                  type="tel"
                  className={field}
                  placeholder="416 555 0134"
                  value={form["phone"] ?? ""}
                  onChange={(e) => set("phone", e.target.value)}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="street">Street address</label>
                <input
                  id="street"
                  className={field}
                  value={form["street_address"] ?? ""}
                  onChange={(e) => set("street_address", e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="city">City</label>
                <input
                  id="city"
                  className={field}
                  value={form["city"] ?? ""}
                  onChange={(e) => set("city", e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="province">Province</label>
                  <select
                    id="province"
                    className={field}
                    value={form["province"] ?? "ON"}
                    onChange={(e) => set("province", e.target.value)}
                  >
                    {PROVINCES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="postal">Postal code</label>
                  <input
                    id="postal"
                    className={field}
                    placeholder="M5V 2T6"
                    value={form["postal_code"] ?? ""}
                    onChange={(e) => set("postal_code", e.target.value.toUpperCase())}
                    required
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[20px] ring-1 ring-black/5 bg-card p-5 sm:p-6">
            <h2 className={sectionTitle}>2. Driver's licence</h2>
            <p className="text-sm text-muted-foreground mt-1">
              A full provincial licence is required — learner permits (G1, G2, Class 7) are not
              eligible.
            </p>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="licence-number">Licence number</label>
                <input
                  id="licence-number"
                  className={field}
                  value={form["licence_number"] ?? ""}
                  onChange={(e) => set("licence_number", e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="licence-province">Issuing province</label>
                  <select
                    id="licence-province"
                    className={field}
                    value={form["licence_province"] ?? "ON"}
                    onChange={(e) => set("licence_province", e.target.value)}
                  >
                    {PROVINCES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="licence-class">Class</label>
                  <input
                    id="licence-class"
                    className={field}
                    placeholder="G / 5"
                    value={form["licence_class"] ?? ""}
                    onChange={(e) => set("licence_class", e.target.value.toUpperCase())}
                    required
                  />
                </div>
              </div>
              <div>
                <label className={labelClass} htmlFor="licence-expiry">Expiry date</label>
                <input
                  id="licence-expiry"
                  type="date"
                  className={field}
                  value={form["licence_expiry"] ?? ""}
                  onChange={(e) => set("licence_expiry", e.target.value)}
                  required
                />
              </div>
            </div>
          </section>

          <section className="rounded-[20px] ring-1 ring-black/5 bg-card p-5 sm:p-6">
            <h2 className={sectionTitle}>3. Your vehicle</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Four-door vehicle, 2010 or newer, in safe mechanical condition.
            </p>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="make">Make</label>
                <input
                  id="make"
                  className={field}
                  placeholder="Toyota"
                  value={form["vehicle_make"] ?? ""}
                  onChange={(e) => set("vehicle_make", e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="model">Model</label>
                <input
                  id="model"
                  className={field}
                  placeholder="Corolla"
                  value={form["vehicle_model"] ?? ""}
                  onChange={(e) => set("vehicle_model", e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="year">Year</label>
                  <input
                    id="year"
                    type="number"
                    min={2010}
                    max={new Date().getFullYear() + 1}
                    className={field}
                    value={form["vehicle_year"] ?? ""}
                    onChange={(e) => set("vehicle_year", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="colour">Colour</label>
                  <input
                    id="colour"
                    className={field}
                    value={form["vehicle_colour"] ?? ""}
                    onChange={(e) => set("vehicle_colour", e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="plate">Plate number</label>
                  <input
                    id="plate"
                    className={field}
                    value={form["plate_number"] ?? ""}
                    onChange={(e) => set("plate_number", e.target.value.toUpperCase())}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="plate-province">Plate province</label>
                  <select
                    id="plate-province"
                    className={field}
                    value={form["plate_province"] ?? "ON"}
                    onChange={(e) => set("plate_province", e.target.value)}
                  >
                    {PROVINCES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[20px] ring-1 ring-black/5 bg-card p-5 sm:p-6">
            <h2 className={sectionTitle}>4. Insurance</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Valid Canadian auto insurance is mandatory. Tell your insurer you carpool and share
              costs.
            </p>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="insurer">Insurance company</label>
                <input
                  id="insurer"
                  className={field}
                  value={form["insurance_company"] ?? ""}
                  onChange={(e) => set("insurance_company", e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="policy">Policy number</label>
                <input
                  id="policy"
                  className={field}
                  value={form["insurance_policy_number"] ?? ""}
                  onChange={(e) => set("insurance_policy_number", e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="insurance-expiry">Policy expiry</label>
                <input
                  id="insurance-expiry"
                  type="date"
                  className={field}
                  value={form["insurance_expiry"] ?? ""}
                  onChange={(e) => set("insurance_expiry", e.target.value)}
                  required
                />
              </div>
            </div>
          </section>

          <section className="rounded-[20px] ring-1 ring-black/5 bg-card p-5 sm:p-6">
            <h2 className={sectionTitle}>5. Documents</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Clear photos or PDFs, under 10 MB each. Only you and our review team can see them.
            </p>
            <div className="mt-5 space-y-3">
              {DOCUMENTS.map((doc) => {
                const uploaded = Boolean(docs[doc.key]);
                return (
                  <div
                    key={doc.key}
                    className="rounded-[14px] bg-background ring-1 ring-black/5 px-4 py-3.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {doc.label}
                          {!doc.required && (
                            <span className="text-muted-foreground font-normal"> (optional)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{doc.hint}</p>
                      </div>
                      <label className="shrink-0 cursor-pointer rounded-[10px] bg-card ring-1 ring-line px-3.5 py-2 text-sm font-medium text-foreground">
                        {uploading === doc.key
                          ? "Uploading…"
                          : uploaded
                            ? "Replace"
                            : "Upload"}
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="sr-only"
                          onChange={(e) => pickFile(doc.key, e.target.files?.[0])}
                        />
                      </label>
                    </div>
                    {uploaded && (
                      <p className="text-xs text-primary-deep mt-2">Uploaded and stored securely</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[20px] ring-1 ring-black/5 bg-card p-5 sm:p-6">
            <h2 className={sectionTitle}>6. Declarations</h2>
            <div className="mt-4 space-y-3 text-sm text-foreground">
              <label className="flex gap-3 items-start">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={consents.background}
                  onChange={(e) => setConsents((c) => ({ ...c, background: e.target.checked }))}
                />
                <span>
                  I consent to a criminal record and driving record check, and to Crossline
                  collecting and verifying the documents above under Canadian privacy law (PIPEDA).
                </span>
              </label>
              <label className="flex gap-3 items-start">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={consents.terms}
                  onChange={(e) => setConsents((c) => ({ ...c, terms: e.target.checked }))}
                />
                <span>
                  I understand Crossline is cost-sharing carpooling, not a taxi or livery service,
                  and I will not charge more than the cost of the trip.
                </span>
              </label>
              <label className="flex gap-3 items-start">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={consents.accurate}
                  onChange={(e) => setConsents((c) => ({ ...c, accurate: e.target.checked }))}
                />
                <span>
                  Everything I've provided is true and current, and I'll update Crossline if my
                  licence, insurance or vehicle changes.
                </span>
              </label>
            </div>
          </section>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-[12px] bg-primary hover:bg-primary-deep text-primary-foreground text-sm font-semibold py-3.5 disabled:opacity-60"
          >
            {busy
              ? "Submitting…"
              : status === "rejected"
                ? "Resubmit application"
                : status === "submitted"
                  ? "Update and resubmit"
                  : "Submit for review"}
          </button>
        </fieldset>
      </form>
    </div>
  );
}
