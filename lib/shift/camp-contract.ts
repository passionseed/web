export type ShiftAction =
  | "list"
  | "snapshot"
  | "create_cohort"
  | "enroll"
  | "introduction"
  | "create_group"
  | "assign_group"
  | "invite"
  | "answer_invite"
  | "create_project"
  | "edit_project"
  | "save_update"
  | "comment"
  | "message"
  | "request"
  | "checkin"
  | "complete_milestone"
  | "checkpoint"
  | "resolve_request"
  | "moderate"
  | "moderate_comment"
  | "moderate_message";
export type ShiftIntroduction = {
  version?: number;
  step?: number;
  language?: "en" | "th";
  availability?: string;
  interests?: string;
  idea?: string;
};
export type ShiftCohort = {
  id: string;
  name: string;
  starts_on: string;
  introduced_at?: string | null;
  is_staff?: boolean;
  map_id?: string;
  classroom_id?: string;
  community_id?: string;
};
export type ShiftParticipant = {
  id: string;
  name: string;
  role: "participant" | "mentor";
  group_id: string | null;
  project_id: string | null;
  introduction: ShiftIntroduction | null;
};
export type ShiftGroup = { id: string; name: string; members: string[] };
export type ShiftProject = {
  id: string;
  title: string;
  description: string;
  owner_id: string;
  scope: string;
  skills: string[];
  members: string[];
};
export type ShiftUpdateBody = {
  shipped?: string;
  broke?: string;
  learned?: string;
  help?: string;
  problem?: string;
  evidence?: string;
  changes?: string;
  link?: string;
  screenshots?: string[];
};
export type ShiftUpdate = {
  id: string;
  project_id: string;
  day: number;
  post_id: string | null;
  body: ShiftUpdateBody;
  contributor_ids: string[];
  author_id: string;
  revision: number;
  hidden: boolean;
  published_at: string | null;
  updated_at: string;
};
export type ShiftComment = {
  hidden?: boolean;
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
};
export type ShiftInvitation = {
  id: string;
  kind: "group" | "project";
  target_id: string;
  invited_by: string;
  invitee: string;
  status: "pending" | "accepted" | "declined";
};
export type ShiftMessage = {
  hidden?: boolean;
  id: string;
  group_id: string;
  author_id: string;
  body: string;
  created_at: string;
};
export type ShiftRequest = {
  id: string;
  user_id: string;
  project_id: string | null;
  update_id: string | null;
  kind: "help" | "report";
  body: string;
  resolution: string | null;
  resolved_at: string | null;
  created_at: string;
};
export type ShiftCheckpoint = {
  project_id: string;
  day: number;
  mentor_id: string;
  feedback: string;
  reviewed_at: string;
};
export type ShiftCheckin = {
  user_id: string;
  day: number;
  choice: number | null;
  capability: number | null;
  support: number | null;
};
export type ShiftSnapshot = {
  cohort: ShiftCohort;
  user_id: string;
  is_staff: boolean;
  introduction: ShiftIntroduction | null;
  introduced_at: string | null;
  participants: ShiftParticipant[];
  groups: ShiftGroup[];
  projects: ShiftProject[];
  updates: ShiftUpdate[];
  comments: ShiftComment[];
  invitations: ShiftInvitation[];
  messages: ShiftMessage[];
  requests: ShiftRequest[];
  checkpoints: ShiftCheckpoint[];
  checkins: ShiftCheckin[];
  nodes: { id: string; title: string; day: number | null }[];
  progress: { node_id: string; status: string }[];
};
