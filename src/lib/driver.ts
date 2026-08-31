import { supabase } from "@/integrations/supabase/client";

export type DriverApplication = {
  id: string;
  user_id: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  legal_name: string | null;
  date_of_birth: string | null;
  phone: string | null;
  street_address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  licence_number: string | null;
  licence_province: string | null;
  licence_class: string | null;
  licence_expiry: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  vehicle_colour: string | null;
  plate_number: string | null;
  plate_province: string | null;
  insurance_company: string | null;
  insurance_policy_number: string | null;
  insurance_expiry: string | null;
  licence_front_path: string | null;
  licence_back_path: string | null;
  insurance_path: string | null;
  registration_path: string | null;
  abstract_path: string | null;
  consent_background_check: boolean;
  consent_terms: boolean;
  consent_accurate: boolean;
  review_notes: string | null;
  submitted_at: string | null;
};

export const PROVINCES = [
  "AB",
  "BC",
  "MB",
  "NB",
  "NL",
  "NS",
  "NT",
  "NU",
  "ON",
  "PE",
  "QC",
  "SK",
  "YT",
] as const;

export const DOCUMENTS = [
  {
    key: "licence_front_path",
    label: "Driver's licence — front",
    hint: "Provincial licence, valid and not expired.",
    required: true,
  },
  {
    key: "licence_back_path",
    label: "Driver's licence — back",
    hint: "Both sides are required for identity checks.",
    required: true,
  },
  {
    key: "insurance_path",
    label: "Proof of insurance (pink slip)",
    hint: "Must be valid for the vehicle you drive and list you as a driver.",
    required: true,
  },
  {
    key: "registration_path",
    label: "Vehicle registration / ownership",
    hint: "Provincial vehicle permit showing plate and VIN.",
    required: true,
  },
  {
    key: "abstract_path",
    label: "Driver's abstract (driving record)",
    hint: "Issued in the last 90 days by your province (e.g. ServiceOntario, ICBC).",
    required: false,
  },
] as const;

export type DocumentKey = (typeof DOCUMENTS)[number]["key"];

export async function getMyDriverApplication(): Promise<DriverApplication | null> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from("driver_applications")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) throw error;
  return (data as DriverApplication | null) ?? null;
}

export async function uploadDriverDocument(userId: string, key: DocumentKey, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/${key}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("driver-docs").upload(path, file, {
    upsert: true,
    ...(file.type ? { contentType: file.type } : {}),
  });
  if (error) throw error;
  return path;
}

export function isVerifiedDriver(app: DriverApplication | null | undefined) {
  return app?.status === "approved";
}

export function statusCopy(status: DriverApplication["status"]) {
  switch (status) {
    case "approved":
      return { title: "Approved", body: "You're verified and can publish rides." };
    case "submitted":
      return {
        title: "In review",
        body: "We're checking your documents. Most reviews finish within 1–2 business days.",
      };
    case "rejected":
      return {
        title: "Needs attention",
        body: "Something didn't pass review. Update the details below and resubmit.",
      };
    default:
      return { title: "Draft", body: "Finish every section, then submit for review." };
  }
}
