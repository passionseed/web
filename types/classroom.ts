// Classroom System Types
// Based on the classroom database schema

export interface Classroom {
  id: string; // uuid
  name: string;
  description: string | null;
  instructor_id: string; // uuid
  join_code: string; // 6-8 character unique code
  max_students: number;
  is_active: boolean;
  enable_assignments?: boolean; // toggle for assignment features
  settings?: Record<string, any>; // additional settings as JSONB
  created_at: string; // timestamp with time zone
  updated_at: string; // timestamp with time zone
}

export interface ClassroomMembership {
  id: string; // uuid
  classroom_id: string; // uuid
  user_id: string; // uuid
  role: ClassroomRole;
  joined_at: string; // timestamp with time zone
}

export type ClassroomRole = "student" | "ta" | "instructor";

export interface ClassroomAssignment {
  id: string; // uuid
  classroom_id: string; // uuid
  title: string;
  description: string | null;
  instructions: string | null;
  created_by: string; // uuid
  default_due_date: string | null; // timestamp with time zone
  source_map_id: string | null; // uuid - map this assignment was created from
  map_context: string | null; // context about how assignment relates to source map
  is_published: boolean;
  is_active: boolean;
  auto_assign: boolean; // automatically enrolls all current and future students
  created_at: string; // timestamp with time zone
  updated_at: string; // timestamp with time zone
}

export interface AssignmentNode {
  id: string; // uuid
  assignment_id: string; // uuid
  node_id: string; // uuid
  sequence_order: number;
  is_required: boolean;
  created_at: string; // timestamp with time zone
}

export interface AssignmentGroup {
  id: string; // uuid
  classroom_id: string; // uuid
  name: string;
  description: string | null;
  color: string; // hex color code
  max_members: number | null; // null means unlimited
  created_by: string; // uuid
  created_at: string; // timestamp with time zone
  updated_at: string; // timestamp with time zone
  is_active: boolean;
}

export interface AssignmentGroupMember {
  id: string; // uuid
  group_id: string; // uuid
  user_id: string; // uuid
  role: GroupMemberRole;
  joined_at: string; // timestamp with time zone
  added_by: string | null; // uuid
}

export type GroupMemberRole = "leader" | "member";

export interface AssignmentGroupAssignment {
  id: string; // uuid
  assignment_id: string; // uuid
  group_id: string; // uuid
  due_date: string | null; // timestamp with time zone
  instructions: string | null; // group-specific instructions
  created_at: string; // timestamp with time zone
  created_by: string; // uuid
}

export interface AssignmentGroupWithMembers extends AssignmentGroup {
  members: (AssignmentGroupMember & {
    profiles: {
      full_name: string | null;
      username: string | null;
      email: string;
    }
  })[];
  member_count: number;
}

export interface AssignmentGroupWithAssignments extends AssignmentGroup {
  assignments: (AssignmentGroupAssignment & {
    classroom_assignments: ClassroomAssignment;
  })[];
}

export interface AssignmentGroupWithProgress extends AssignmentGroup {
  members: (AssignmentGroupMember & {
    profiles: {
      full_name: string | null;
      username: string | null;
      email: string;
    };
    progress?: {
      completion_percentage: number;
      status: AssignmentStatus;
      completed_nodes: number;
      total_nodes: number;
      last_activity?: string;
    };
  })[];
  overall_progress: {
    completion_percentage: number;
    average_score: number | null;
    submitted_assignments: number;
    total_assignments: number;
    active_members: number;
  };
  recent_activity?: {
    user_id: string;
    username: string;
    action: string;
    timestamp: string;
  }[];
}

// ========================================
// CLASSROOM-EXCLUSIVE MAPS TYPES
// ========================================

export type MapType = 'public' | 'private' | 'classroom_exclusive' | 'seed';

export type ClassroomMapFeatureType =
  | 'live_collaboration'
  | 'auto_assessment'
  | 'peer_review'
  | 'progress_tracking'
  | 'time_boxed_access'
  | 'custom_branding'
  | 'advanced_analytics';

export interface ClassroomMapFeature {
  id: string;
  map_id: string;
  feature_type: ClassroomMapFeatureType;
  feature_config: Record<string, any>;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ClassroomExclusiveMap {
  id: string;
  title: string;
  description: string | null;
  creator_id: string;
  parent_classroom_id: string;
  map_type: 'classroom_exclusive';
  created_at: string;
  updated_at: string;
  node_count: number;
  features: ClassroomMapFeature[];
}

export interface CreateClassroomMapRequest {
  title: string;
  description?: string;
  initial_features?: {
    feature_type: ClassroomMapFeatureType;
    feature_config: Record<string, any>;
  }[];
}

export interface UpdateClassroomMapFeatureRequest {
  feature_type: ClassroomMapFeatureType;
  feature_config: Record<string, any>;
  is_enabled: boolean;
}

// Extended learning map interface that includes classroom-exclusive properties
export interface ExtendedLearningMap {
  id: string;
  title: string;
  description: string | null;
  creator_id: string;
  map_type: MapType;
  parent_classroom_id: string | null;
  parent_seed_id: string | null;
  visibility: string;
  created_at: string;
  updated_at: string;
  node_count: number;
  features?: ClassroomMapFeature[];
}

export interface GroupGradingSummary {
  group_id: string;
  group_name: string;
  assignment_id: string;
  assignment_title: string;
  average_score: number | null;
  submission_count: number;
  total_members: number;
  grading_status: "not_started" | "in_progress" | "completed";
  graded_submissions: number;
  due_date: string | null;
  members: Array<{
    user_id: string;
    username: string;
    full_name: string | null;
    submission_status: "not_started" | "in_progress" | "submitted" | "graded";
    score: number | null;
    last_activity: string | null;
  }>;
}

export interface GroupMapProgress {
  group_id: string;
  map_id: string;
  total_nodes: number;
  completed_nodes: number;
  average_completion: number;
  member_progress: Array<{
    user_id: string;
    username: string;
    completed_nodes: number;
    completion_percentage: number;
    last_activity: string | null;
  }>;
  recent_completions: Array<{
    node_id: string;
    node_title: string;
    completed_by: string;
    completed_at: string;
    username: string;
  }>;
}

export interface AssignmentEnrollment {
  id: string; // uuid
  assignment_id: string; // uuid
  user_id: string; // uuid
  assigned_at: string; // timestamp with time zone
  due_date: string | null; // timestamp with time zone (can override default)
  status: AssignmentStatus;
  completed_at: string | null; // timestamp with time zone
  completion_percentage: number; // 0-100
  notes: string | null; // instructor notes for this student
}

export type AssignmentStatus =
  | "assigned"
  | "in_progress"
  | "submitted"
  | "completed"
  | "overdue";

// New types for classroom-map linking

export interface ClassroomMap {
  id: string; // uuid
  classroom_id: string; // uuid
  map_id: string; // uuid
  added_by: string; // uuid
  added_at: string; // timestamp with time zone
  is_active: boolean;
  display_order: number;
  notes: string | null;
}

export interface ClassroomMapWithDetails extends ClassroomMap {
  map: {
    id: string;
    title: string;
    description: string | null;
    node_count: number;
    category: string | null;
    difficulty_level: number | null;
  };
  added_by_user: {
    id: string;
    username: string;
    full_name: string | null;
  };
}

export interface AvailableMapNode {
  node_id: string;
  node_title: string;
  node_description: string | null;
  has_content: boolean;
  has_assessment: boolean;
  difficulty: number | null;
  estimated_time: number | null;
}

export interface AvailableMap {
  map_id: string;
  map_title: string;
  map_description: string | null;
  nodes: AvailableMapNode[];
}

// Extended types with relations for UI components

export interface ClassroomWithMembers extends Classroom {
  members: (ClassroomMembership & {
    profiles: {
      id: string;
      username: string;
      full_name: string | null;
      avatar_url: string | null;
    };
  })[];
  member_count: number;
  student_count: number;
}

export interface ClassroomWithAssignments extends Classroom {
  assignments: ClassroomAssignment[];
  assignment_count: number;
  active_assignment_count: number;
}

export interface ClassroomWithMaps extends Classroom {
  linked_maps: ClassroomMapWithDetails[];
  map_count: number;
  available_nodes_count: number;
}

export interface ClassroomWithAll
  extends ClassroomWithMembers,
  ClassroomWithMaps {
  assignments: (ClassroomAssignment & {
    source_map?: {
      id: string;
      title: string;
    };
  })[];
  assignment_count: number;
  active_assignment_count: number;
}

export interface AssignmentWithNodes extends ClassroomAssignment {
  assignment_nodes: (AssignmentNode & {
    map_nodes: {
      id: string;
      title: string;
      map_id: string;
      difficulty: number;
      learning_maps: {
        id: string;
        title: string;
        category: string | null;
      };
    };
  })[];
  node_count: number;
  required_node_count: number;
}

export interface AssignmentWithProgress extends ClassroomAssignment {
  assignment_nodes: (AssignmentNode & {
    map_nodes: {
      id: string;
      title: string;
      difficulty: number;
    };
  })[];
  enrollment: AssignmentEnrollment | null; // null if current user not enrolled
  progress_stats: {
    total_students: number;
    completed_students: number;
    in_progress_students: number;
    overdue_students: number;
    average_completion: number;
  };
}

export interface StudentAssignmentView extends AssignmentWithNodes {
  enrollment: AssignmentEnrollment;
  classroom: {
    id: string;
    name: string;
    instructor: {
      id: string;
      username: string;
      full_name: string | null;
    };
  };
  node_progress: Record<
    string,
    {
      status: import("./map").ProgressStatus;
      submitted_at: string | null;
      started_at: string | null;
    }
  >;
  is_overdue: boolean;
  days_until_due: number | null;
}

// Request/Response types for API

export interface CreateClassroomRequest {
  name: string;
  description?: string;
  max_students?: number;
}

export interface CreateClassroomResponse {
  classroom: Classroom;
  join_code: string;
}

export interface JoinClassroomRequest {
  join_code: string;
}

export interface JoinClassroomResponse {
  classroom: Classroom;
  membership: ClassroomMembership;
}

export interface CreateAssignmentRequest {
  classroom_id: string;
  title: string;
  description?: string;
  instructions?: string;
  default_due_date?: string;
  source_map_id?: string; // Optional: map this assignment is based on
  node_ids?: string[]; // IDs of nodes to include (optional for simple creation)
  student_ids?: string[]; // IDs of students to assign to (optional, defaults to all)
  custom_due_dates?: Record<string, string>; // student_id -> due_date overrides
  auto_enroll?: boolean; // Whether to auto-enroll all classroom students
  auto_assign?: boolean; // Whether this assignment auto-enrolls future students
}

export interface CreateAssignmentFromMapRequest {
  classroom_id: string;
  map_id: string;
  title: string;
  description?: string;
  selected_node_ids?: string[]; // If not provided, uses all nodes from map
  auto_enroll?: boolean;
}

export interface LinkMapToClassroomRequest {
  classroom_id: string;
  map_id: string;
  notes?: string;
}

export interface LinkMapToClassroomResponse {
  link_id: string;
  classroom_id: string;
  map_id: string;
  display_order: number;
  added_at: string;
}

export interface UnlinkMapFromClassroomRequest {
  classroom_id: string;
  map_id: string;
}

export interface ReorderClassroomMapsRequest {
  classroom_id: string;
  link_orders: {
    link_id: string;
    order: number;
  }[];
}

export interface CreateAssignmentResponse {
  assignment: ClassroomAssignment;
  nodes_added: number;
  students_enrolled: number;
}

export interface AssignmentProgressStats {
  assignment_id: string;
  total_enrollments: number;
  completed_enrollments: number;
  in_progress_enrollments: number;
  overdue_enrollments: number;
  not_started_enrollments: number;
  average_completion_percentage: number;
  completion_rate: number; // percentage of students who completed
  on_time_completion_rate: number; // percentage who completed before due date
}

export interface ClassroomAnalytics {
  classroom_id: string;
  total_students: number;
  total_assignments: number;
  active_assignments: number;
  overall_completion_rate: number;
  average_assignment_completion_time: number; // days
  student_engagement_score: number; // 0-100 based on activity
  assignment_stats: AssignmentProgressStats[];
  top_performing_students: {
    user_id: string;
    username: string;
    completion_rate: number;
    average_score: number;
    assignments_completed: number;
  }[];
  struggling_students: {
    user_id: string;
    username: string;
    completion_rate: number;
    overdue_assignments: number;
    needs_attention: boolean;
  }[];
}

// Utility types for forms and UI state

export interface ClassroomFormData {
  name: string;
  description: string;
  max_students: number;
}

export interface AssignmentFormData {
  title: string;
  description: string;
  instructions: string;
  default_due_date: Date | null;
  source_map_id: string | null; // Selected map for assignment creation
  creation_mode: "from_map" | "custom"; // How the assignment is being created
  selected_nodes: {
    node_id: string;
    map_title: string;
    node_title: string;
    difficulty: number;
    sequence_order: number;
    is_required: boolean;
  }[];
  selected_students: {
    user_id: string;
    username: string;
    custom_due_date?: Date;
  }[];
  auto_enroll: boolean; // Whether to automatically enroll all students
}

export interface MapLinkFormData {
  map_id: string;
  notes: string;
}

export interface ClassroomFilters {
  search: string;
  status: "all" | "active" | "inactive";
  role: "all" | "instructor" | "student";
  sort_by: "name" | "created_at" | "member_count";
  sort_order: "asc" | "desc";
}

export interface AssignmentFilters {
  search: string;
  status: "all" | "active" | "inactive";
  due_date: "all" | "overdue" | "due_soon" | "future";
  completion: "all" | "not_started" | "in_progress" | "completed";
  sort_by: "title" | "due_date" | "created_at" | "completion_rate";
  sort_order: "asc" | "desc";
}

// Error types for better error handling

export class ClassroomError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = "ClassroomError";
  }
}

export class ClassroomValidationError extends Error {
  constructor(
    public field: string,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "ClassroomValidationError";
  }
}

export class JoinCodeError extends Error {
  constructor(
    public code:
      | "INVALID_CODE"
      | "EXPIRED_CODE"
      | "CLASSROOM_FULL"
      | "ALREADY_MEMBER",
    message: string
  ) {
    super(message);
    this.name = "JoinCodeError";
  }
}

// Constants

export const CLASSROOM_CONSTANTS = {
  MIN_JOIN_CODE_LENGTH: 6,
  MAX_JOIN_CODE_LENGTH: 8,
  DEFAULT_MAX_STUDENTS: 30,
  JOIN_CODE_EXPIRY_DAYS: 90,
  MAX_ASSIGNMENTS_PER_CLASSROOM: 100,
  MAX_NODES_PER_ASSIGNMENT: 50,
} as const;

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  assigned: "Assigned",
  in_progress: "In Progress",
  submitted: "Submitted",
  completed: "Completed",
  overdue: "Overdue",
} as const;

export const CLASSROOM_ROLE_LABELS: Record<ClassroomRole, string> = {
  student: "Student",
  ta: "Teaching Assistant",
  instructor: "Instructor",
} as const;
