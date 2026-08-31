import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { evaluateApplication, type ApplicationInput } from "@/lib/driver-rules";

export type DecisionOutcome = {
  status: "approved" | "submitted" | "rejected";
  decision_source: "auto" | "manual";
  reason: string | null;
};

function decide(app: ApplicationInput): DecisionOutcome {
  const { failures, warnings, eligible } = evaluateApplication(app);
  if (!eligible) {
    return { status: "rejected", decision_source: "auto", reason: failures.join(" ") };
  }
  if (warnings.length > 0) {
    return { status: "submitted", decision_source: "auto", reason: warnings.join(" ") };
  }
  return {
    status: "approved",
    decision_source: "auto",
    reason: "All eligibility checks passed automatically.",
  };
}

const str = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);

export const submitDriverApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: Record<string, unknown>) => data)
  .handler(async ({ data, context }) => {
    const payload = {
      user_id: context.userId,
      legal_name: str(data["legal_name"]),
      date_of_birth: str(data["date_of_birth"]),
      phone: str(data["phone"]),
      street_address: str(data["street_address"]),
      city: str(data["city"]),
      province: str(data["province"]),
      postal_code: str(data["postal_code"]),
      licence_number: str(data["licence_number"]),
      licence_province: str(data["licence_province"]),
      licence_class: str(data["licence_class"]),
      licence_expiry: str(data["licence_expiry"]),
      vehicle_make: str(data["vehicle_make"]),
      vehicle_model: str(data["vehicle_model"]),
      vehicle_year: data["vehicle_year"] ? Number(data["vehicle_year"]) : null,
      vehicle_colour: str(data["vehicle_colour"]),
      plate_number: str(data["plate_number"]),
      plate_province: str(data["plate_province"]),
      insurance_company: str(data["insurance_company"]),
      insurance_policy_number: str(data["insurance_policy_number"]),
      insurance_expiry: str(data["insurance_expiry"]),
      licence_front_path: str(data["licence_front_path"]),
      licence_back_path: str(data["licence_back_path"]),
      insurance_path: str(data["insurance_path"]),
      registration_path: str(data["registration_path"]),
      abstract_path: str(data["abstract_path"]),
      consent_background_check: data["consent_background_check"] === true,
      consent_terms: data["consent_terms"] === true,
      consent_accurate: data["consent_accurate"] === true,
      submitted_at: new Date().toISOString(),
    };

    // Applications that are already approved cannot be re-submitted by the driver.
    const { data: existing } = await context.supabase
      .from("driver_applications")
      .select("status")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing?.status === "approved") {
      return { status: "approved" as const, reason: null, failures: [] as string[] };
    }

    const outcome = decide(payload);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("driver_applications").upsert(
      {
        ...payload,
        status: outcome.status,
        decision_source: outcome.decision_source,
        decision_reason: outcome.reason,
        review_notes: outcome.reason,
        reviewed_at: outcome.status === "submitted" ? null : new Date().toISOString(),
        reviewed_by: null,
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);

    return {
      status: outcome.status,
      reason: outcome.reason,
      failures: evaluateApplication(payload).failures,
    };
  });

async function assertReviewer(context: { supabase: any; userId: string }) {
  const [{ data: isAdmin }, { data: isReviewer }] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "reviewer" }),
  ]);
  if (!isAdmin && !isReviewer) throw new Error("Forbidden");
}

export const getMyReviewAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: reviewer } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "reviewer",
    });
    return { isAdmin: Boolean(data), isReviewer: Boolean(data) || Boolean(reviewer) };
  });

export const listDriverApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertReviewer(context);
    const { data, error } = await context.supabase
      .from("driver_applications")
      .select("*")
      .order("submitted_at", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<Record<string, any>>;
  });

export const decideDriverApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; decision: "approved" | "rejected"; notes?: string }) => {
    if (!data?.id) throw new Error("Missing application id");
    if (data.decision !== "approved" && data.decision !== "rejected") {
      throw new Error("Invalid decision");
    }
    return { id: data.id, decision: data.decision, notes: (data.notes ?? "").slice(0, 1000) };
  })
  .handler(async ({ data, context }) => {
    await assertReviewer(context);
    const { error } = await context.supabase
      .from("driver_applications")
      .update({
        status: data.decision,
        decision_source: "manual",
        decision_reason: data.notes || null,
        review_notes: data.notes || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: context.userId,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getDriverDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { path: string }) => {
    if (!data?.path) throw new Error("Missing document path");
    return { path: data.path };
  })
  .handler(async ({ data, context }) => {
    await assertReviewer(context);
    const { data: signed, error } = await context.supabase.storage
      .from("driver-docs")
      .createSignedUrl(data.path, 300);
    if (error) throw new Error(error.message);
    return { url: signed?.signedUrl ?? null };
  });
