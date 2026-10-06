export type CompanionCohort = { id: string; name: string; starts_on: string };
export type CompanionCohorts = {
  ok: true;
  is_admin: boolean;
  cohorts: CompanionCohort[];
};
export type CompanionRosterEntry = {
  id: string;
  email: string | null;
  mobile: string | null;
  claimed: boolean;
  claimed_at: string | null;
  created_at: string;
  expires_at: string | null;
};
export type CompanionInvite = {
  ok: true;
  roster_id: string;
  code: string;
  expires_at: string;
};
export type CompanionDailyUpdate = {
  id: string;
  author_id: string;
  author_name: string;
  tried: string;
  learned: string | null;
  help: string | null;
  link: string | null;
  image_path: string | null;
  image_url?: string | null;
  submitted_at: string;
  updated_at: string;
  revision: number;
};
export type CompanionToday = {
  ok: true;
  today: string;
  updates: CompanionDailyUpdate[];
};
