// Badge System Types

export interface SeedBadgeConfig {
    id: string; // uuid
    seed_id: string; // uuid
    badge_name: string;
    badge_description: string | null;
    badge_image_url: string | null;
    badge_image_key: string | null;
    primary_color: string;
    secondary_color: string;
    created_at: string; // timestamptz
    updated_at: string; // timestamptz
}

export interface UserBadge {
    id: string; // uuid
    user_id: string; // uuid
    seed_id: string; // uuid
    seed_badge_id: string | null; // uuid
    badge_data: BadgeData; // JSONB
    room_id: string | null; // uuid
    completion_id: string | null; // uuid
    earned_at: string; // timestamptz
    is_seen?: boolean;
}

export interface BadgeData {
    badge_name: string;
    badge_description: string | null;
    badge_image_url: string | null;
    primary_color: string;
    secondary_color: string;
    seed_title: string;
    seed_id: string;
    completion_date: string;
    room_id: string | null;
}

// Badge with seed information (for display)
export interface UserBadgeWithSeed extends UserBadge {
    seed?: {
        id: string;
        title: string;
        cover_image_url: string | null;
    };
}

// Badge statistics
export interface BadgeStats {
    total_awarded: number;
    awarded_this_month: number;
    awarded_this_week: number;
}

// Badge notification data
export interface BadgeNotification {
    badge_id: string;
    badge_name: string;
    badge_image_url: string | null;
    seed_title: string;
    earned_at: string;
}
