export type MentorSessionType = 'healthcare' | 'group';
export type MentorBookingStatus = 'pending' | 'confirmed' | 'cancelled';

export type MentorProfile = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  profession: string;
  institution: string;
  bio: string;
  photo_url: string | null;
  line_user_id: string | null;
  session_type: MentorSessionType;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
};

export type MentorAvailabilitySlot = {
  id: string;
  mentor_id: string;
  day_of_week: number; // 0=Mon … 6=Sun
  hour: number;        // 0–23
};

export type MentorBooking = {
  id: string;
  mentor_id: string;
  student_id: string | null;
  slot_datetime: string;
  duration_minutes: number;
  status: MentorBookingStatus;
  notes: string | null;
  created_at: string;
};

export type MentorTeamAssignment = {
  id: string;
  mentor_id: string;
  team_id: string;
  hackathon_id: string;
  assigned_at: string;
  assigned_by: string | null;
};
