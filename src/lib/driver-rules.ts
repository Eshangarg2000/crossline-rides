// Shared eligibility rules for driver applications.
// Used client-side for instant feedback and re-run server-side as the source of truth.

export type ApplicationInput = {
  legal_name?: string | null;
  date_of_birth?: string | null;
  phone?: string | null;
  street_address?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  licence_number?: string | null;
  licence_province?: string | null;
  licence_class?: string | null;
  licence_expiry?: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_year?: number | null;
  plate_number?: string | null;
  insurance_company?: string | null;
  insurance_policy_number?: string | null;
  insurance_expiry?: string | null;
  licence_front_path?: string | null;
  licence_back_path?: string | null;
  insurance_path?: string | null;
  registration_path?: string | null;
  consent_background_check?: boolean | null;
  consent_terms?: boolean | null;
  consent_accurate?: boolean | null;
};

export const MIN_DRIVER_AGE = 19;
export const MIN_VEHICLE_YEAR = 2010;
export const MAX_VEHICLE_AGE_YEARS = 16;
/** Full (non-learner, non-graduated) licence classes across Canada. */
export const FULL_LICENCE_CLASSES = ["G", "5", "1", "2", "3", "4"];

const POSTAL = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;

function yearsSince(dateISO: string) {
  const then = new Date(dateISO).getTime();
  return (Date.now() - then) / (365.25 * 24 * 3600 * 1000);
}

function isPast(dateISO: string) {
  return new Date(dateISO).getTime() < Date.now();
}

export type RuleResult = {
  /** Hard failures — the application cannot be approved. */
  failures: string[];
  /** Things a human should look at, but not disqualifying. */
  warnings: string[];
  eligible: boolean;
};

export function evaluateApplication(app: ApplicationInput): RuleResult {
  const failures: string[] = [];
  const warnings: string[] = [];

  const required: Array<[keyof ApplicationInput, string]> = [
    ["legal_name", "Full legal name"],
    ["date_of_birth", "Date of birth"],
    ["phone", "Phone number"],
    ["street_address", "Street address"],
    ["city", "City"],
    ["province", "Province"],
    ["postal_code", "Postal code"],
    ["licence_number", "Driver's licence number"],
    ["licence_province", "Licence province"],
    ["licence_class", "Licence class"],
    ["licence_expiry", "Licence expiry date"],
    ["vehicle_make", "Vehicle make"],
    ["vehicle_model", "Vehicle model"],
    ["plate_number", "Licence plate"],
    ["insurance_company", "Insurance company"],
    ["insurance_policy_number", "Insurance policy number"],
    ["insurance_expiry", "Insurance expiry date"],
  ];
  for (const [key, label] of required) {
    const value = app[key];
    if (typeof value !== "string" || value.trim() === "") failures.push(`${label} is missing.`);
  }

  if (app.date_of_birth && yearsSince(app.date_of_birth) < MIN_DRIVER_AGE) {
    failures.push(`Drivers must be at least ${MIN_DRIVER_AGE} years old.`);
  }

  if (app.postal_code && !POSTAL.test(app.postal_code.trim())) {
    failures.push("Postal code is not a valid Canadian format (e.g. M5V 2T6).");
  }

  const cls = (app.licence_class ?? "").trim().toUpperCase();
  if (cls && !FULL_LICENCE_CLASSES.includes(cls)) {
    failures.push(
      `Licence class ${cls} is a learner or graduated licence. A full licence (G or Class 5) is required to carry passengers.`,
    );
  }

  if (app.licence_expiry && isPast(app.licence_expiry)) {
    failures.push("Driver's licence has expired.");
  }
  if (app.insurance_expiry && isPast(app.insurance_expiry)) {
    failures.push("Auto insurance policy has expired.");
  } else if (app.insurance_expiry && yearsSince(app.insurance_expiry) > -1 / 12) {
    warnings.push("Insurance expires within 30 days.");
  }

  const year = app.vehicle_year ?? null;
  const currentYear = new Date().getFullYear();
  if (year == null) {
    failures.push("Vehicle year is missing.");
  } else if (year < MIN_VEHICLE_YEAR || currentYear - year > MAX_VEHICLE_AGE_YEARS) {
    failures.push(`Vehicles must be ${MIN_VEHICLE_YEAR} or newer.`);
  } else if (year > currentYear + 1) {
    failures.push("Vehicle year is not valid.");
  }

  const docs: Array<[keyof ApplicationInput, string]> = [
    ["licence_front_path", "Driver's licence — front"],
    ["licence_back_path", "Driver's licence — back"],
    ["insurance_path", "Proof of insurance"],
    ["registration_path", "Vehicle registration"],
  ];
  for (const [key, label] of docs) {
    if (!app[key]) failures.push(`${label} has not been uploaded.`);
  }

  if (!app.consent_background_check || !app.consent_terms || !app.consent_accurate) {
    failures.push("All three declarations must be accepted.");
  }

  return { failures, warnings, eligible: failures.length === 0 };
}
