export type ProfileCompletionFields = {
  full_name: string | null;
  username: string | null;
  date_of_birth: string | null;
};

export type GuardianConsentFields = {
  guardian_phone: string | null;
  guardian_relationship: string | null;
  consent_confirmed_at: string | null;
};

export const PROFILE_COMPLETION_SELECT =
  "full_name, username, date_of_birth";

/** Whole years since DOB. Returns null if DOB unparseable. */
export function getAgeYears(
  dateOfBirth: string,
  now: Date = new Date()
): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateOfBirth.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;

  let age = now.getFullYear() - year;
  const monthNow = now.getMonth() + 1;
  const dayNow = now.getDate();
  if (monthNow < month || (monthNow === month && dayNow < day)) {
    age -= 1;
  }

  return age;
}

/** Thai students often type the Buddhist Era year (e.g. 2552 for 2009). */
const BUDDHIST_ERA_OFFSET = 543;
const BUDDHIST_ERA_MIN_YEAR = 2400;

/** Youngest and oldest age a real learner can have. */
const MIN_AGE_YEARS = 8;
const MAX_AGE_YEARS = 100;

export type DateOfBirthProblem = "invalid" | "too_young" | "too_old";

/** Converts a Buddhist Era year to Gregorian; leaves other dates untouched. */
export function normalizeDateOfBirth(dateOfBirth: string): string {
  const trimmed = dateOfBirth.trim();
  const match = /^(\d{4})(-\d{2}-\d{2})/.exec(trimmed);
  if (!match) return trimmed;

  const year = Number(match[1]);
  if (year < BUDDHIST_ERA_MIN_YEAR) return trimmed;
  return `${year - BUDDHIST_ERA_OFFSET}${match[2]}`;
}

/**
 * Why a date of birth cannot belong to a real learner, or null if it can.
 * A date picker left on today, or a future year, reads as a newborn and
 * would otherwise demand parent consent nobody can give.
 */
export function dateOfBirthProblem(
  dateOfBirth: string,
  now: Date = new Date()
): DateOfBirthProblem | null {
  const age = getAgeYears(dateOfBirth, now);
  if (age === null) return "invalid";
  if (age < MIN_AGE_YEARS) return "too_young";
  if (age > MAX_AGE_YEARS) return "too_old";
  return null;
}

/** Parent/guardian approval required only for ages 18 and under. */
export function requiresGuardianConsent(
  dateOfBirth: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!dateOfBirth) return false;
  const age = getAgeYears(dateOfBirth, now);
  return age !== null && age <= 18;
}

export function isProfileComplete(
  profile: Partial<ProfileCompletionFields> | null | undefined,
  guardian: Partial<GuardianConsentFields> | null | undefined,
  now: Date = new Date()
): boolean {
  const dateOfBirth = profile?.date_of_birth;
  const hasBasics = Boolean(
    profile?.full_name?.trim() && profile?.username?.trim() && dateOfBirth
  );
  if (!hasBasics || !dateOfBirth) return false;

  // An impossible date must be re-entered, not answered with parent consent.
  if (dateOfBirthProblem(dateOfBirth, now)) return false;

  if (!requiresGuardianConsent(dateOfBirth, now)) {
    return true;
  }

  return Boolean(
    guardian?.guardian_phone?.trim() &&
      guardian?.guardian_relationship?.trim() &&
      guardian?.consent_confirmed_at
  );
}
