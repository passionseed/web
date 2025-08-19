// Classroom Teams System Types
// Based on the classroom_teams and team_memberships database tables

export interface ClassroomTeam {
  id: string; // uuid
  classroom_id: string; // uuid
  name: string;
  description: string | null;
  created_by: string; // uuid
  created_at: string; // timestamp with time zone
  is_active: boolean;
  max_members: number | null;
  team_metadata: TeamMetadata | null;
}

export interface TeamMembership {
  id: string; // uuid
  team_id: string; // uuid
  user_id: string; // uuid
  role: TeamRole;
  joined_at: string; // timestamp with time zone
  left_at: string | null; // timestamp with time zone
  is_leader: boolean;
  member_metadata: MemberMetadata | null;
}

export type TeamRole = "member" | "co-leader" | "leader";

export interface TeamMetadata {
  color?: string; // Team color for UI
  avatar_url?: string; // Team avatar/logo
  skills?: string[]; // Team skills/interests
  goals?: string; // Team goals/objectives
  preferred_meeting_times?: string[]; // When team prefers to meet
  communication_platform?: string; // Discord, Slack, etc.
  [key: string]: any; // Allow additional metadata
}

export interface MemberMetadata {
  skills?: string[]; // Member's skills
  availability?: string[]; // When member is available
  role_preferences?: string[]; // What roles they prefer in projects
  [key: string]: any; // Allow additional metadata
}

// Extended types with relations for UI components

// export interface TeamWithMembers extends ClassroomTeam {
//   team_memberships: (TeamMembership & {
//     profiles: {
//       id: string;
//       username: string;
//       full_name: string | null;
//       avatar_url: string | null;
//     };
//   })[];
//   member_count: number;
//   leader?: TeamMembership & {
//     profiles: {
//       id: string;
//       username: string;
//       full_name: string | null;
//       avatar_url: string | null;
//     };
//   };
//   current_user_membership?: TeamMembership | null;
// }
// Better structure - separate the profile data from membership
export interface TeamMembershipWithProfile extends TeamMembership {
  profiles: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface TeamWithMembers extends ClassroomTeam {
  team_memberships: TeamMembershipWithProfile[];
  member_count: number;
  leader?: TeamMembershipWithProfile;
  current_user_membership?: TeamMembership | null;
}

export interface ClassroomWithTeams {
  id: string;
  name: string;
  teams: TeamWithMembers[];
  team_count: number;
  total_team_members: number;
  students_without_teams: number;
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  invited_by: string;
  invited_user: string;
  invited_at: string;
  status: InvitationStatus;
  expires_at: string;
  message?: string;
}

export type InvitationStatus = "pending" | "accepted" | "declined" | "expired";

// Request/Response types for API

export interface CreateTeamRequest {
  classroom_id: string;
  name: string;
  description?: string;
  max_members?: number;
  team_metadata?: TeamMetadata;
}

export interface CreateTeamResponse {
  team: ClassroomTeam;
  membership: TeamMembership;
}

export interface JoinTeamRequest {
  team_id: string;
  message?: string; // Optional message to team leader
}

export interface JoinTeamResponse {
  membership: TeamMembership;
  team: TeamWithMembers;
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  max_members?: number;
  team_metadata?: TeamMetadata;
  is_active?: boolean;
}

export interface InviteToTeamRequest {
  team_id: string;
  user_ids: string[];
  message?: string;
}

export interface InviteToTeamResponse {
  invitations: TeamInvitation[];
  sent_count: number;
}

export interface TeamMembershipUpdateRequest {
  role?: TeamRole;
  is_leader?: boolean;
  member_metadata?: MemberMetadata;
}

// Form data types for UI

export interface TeamFormData {
  name: string;
  description: string;
  max_members: number | null;
  team_metadata: {
    color: string;
    skills: string[];
    goals: string;
    preferred_meeting_times: string[];
    communication_platform: string;
  };
}

export interface TeamSearchFilters {
  search: string;
  has_open_spots: boolean;
  skills: string[];
  sort_by: "name" | "created_at" | "member_count";
  sort_order: "asc" | "desc";
}

export interface MemberInviteFormData {
  selected_users: {
    user_id: string;
    username: string;
    full_name: string | null;
  }[];
  message: string;
}

// Team statistics and analytics

export interface TeamStats {
  total_teams: number;
  active_teams: number;
  average_team_size: number;
  teams_at_capacity: number;
  students_in_teams: number;
  students_without_teams: number;
  team_size_distribution: Record<number, number>; // size -> count
}

export interface TeamAnalytics extends TeamStats {
  most_popular_skills: { skill: string; count: number }[];
  team_formation_trend: { date: string; teams_created: number }[];
  collaboration_metrics: {
    average_response_time: number;
    active_discussions: number;
    shared_projects: number;
  };
}

// Constants

export const TEAM_CONSTANTS = {
  MIN_TEAM_NAME_LENGTH: 2,
  MAX_TEAM_NAME_LENGTH: 100,
  MAX_TEAM_DESCRIPTION_LENGTH: 2000,
  DEFAULT_MAX_MEMBERS: 6,
  MIN_TEAM_SIZE: 2,
  MAX_TEAM_SIZE: 12,
  INVITATION_EXPIRY_DAYS: 7,
  MAX_INVITATIONS_PER_TEAM: 20,
} as const;

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  member: "Member",
  "co-leader": "Co-Leader",
  leader: "Leader",
} as const;

export const TEAM_ROLE_PERMISSIONS = {
  member: {
    can_invite: false,
    can_kick: false,
    can_edit_team: false,
    can_leave: true,
  },
  "co-leader": {
    can_invite: true,
    can_kick: false,
    can_edit_team: false,
    can_leave: true,
  },
  leader: {
    can_invite: true,
    can_kick: true,
    can_edit_team: true,
    can_leave: false, // Leaders must transfer leadership before leaving
  },
} as const;

// Error types

export class TeamError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = "TeamError";
  }
}

export class TeamValidationError extends Error {
  constructor(
    public field: string,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "TeamValidationError";
  }
}

export class TeamPermissionError extends Error {
  constructor(
    public action: string,
    message: string
  ) {
    super(message);
    this.name = "TeamPermissionError";
  }
}

// Utility types

export interface TeamActivityLog {
  id: string;
  team_id: string;
  user_id: string;
  action: TeamAction;
  details: Record<string, any>;
  created_at: string;
}

export type TeamAction =
  | "team_created"
  | "member_joined"
  | "member_left"
  | "member_invited"
  | "member_promoted"
  | "member_demoted"
  | "team_updated"
  | "team_deleted";

export const TEAM_ACTION_LABELS: Record<TeamAction, string> = {
  team_created: "Team Created",
  member_joined: "Member Joined",
  member_left: "Member Left",
  member_invited: "Member Invited",
  member_promoted: "Member Promoted",
  member_demoted: "Member Demoted",
  team_updated: "Team Updated",
  team_deleted: "Team Deleted",
} as const;

// Team matching and recommendations

export interface TeamRecommendation {
  team: TeamWithMembers;
  compatibility_score: number; // 0-100
  matching_skills: string[];
  reasons: string[];
}

export interface StudentProfile {
  user_id: string;
  username: string;
  full_name: string | null;
  skills: string[];
  interests: string[];
  availability: string[];
  preferred_team_size: number;
  communication_style: string;
  project_preferences: string[];
}

export interface TeamMatchingCriteria {
  skills_weight: number;
  availability_weight: number;
  team_size_preference_weight: number;
  communication_style_weight: number;
  max_recommendations: number;
}
