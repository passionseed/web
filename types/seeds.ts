export interface SeedCategory {
    id: string;
    name: string;
    logo_url: string | null;
    created_at: string;
}

export interface Seed {
    id: string; // uuid
    map_id: string; // uuid
    title: string;
    description: string | null;
    slogan: string | null;
    cover_image_url: string | null;
    cover_image_blurhash: string | null;
    cover_image_key: string | null;
    cover_image_updated_at: string | null;
    category_id: string | null;
    category?: SeedCategory; // joined data
    created_by: string | null; // uuid
    created_at: string; // timestamptz
    updated_at: string; // timestamptz
}

export type SeedRoomStatus = 'waiting' | 'active' | 'completed';

export interface SeedRoom {
    id: string; // uuid
    seed_id: string; // uuid
    host_id: string; // uuid
    mentor_id: string | null; // uuid - assigned mentor (admin/instructor)
    join_code: string;
    status: SeedRoomStatus;
    min_students: number;
    max_students: number;
    created_at: string; // timestamptz
    updated_at: string; // timestamptz
}

export interface SeedRoomMember {
    id: string; // uuid
    room_id: string; // uuid
    user_id: string; // uuid
    joined_at: string; // timestamptz
}

export interface SeedRoomCompletion {
    id: string; // uuid
    room_id: string; // uuid
    user_id: string; // uuid
    completed_at: string; // timestamptz
    completed_node_id: string | null; // uuid - The end node that was completed
}

// Certificate System Types

export type CertificateTemplateStyle = 'classic' | 'modern' | 'minimal' | 'elegant' | 'bold';

export interface SeedCertificateConfig {
    id: string; // uuid
    seed_id: string; // uuid
    enabled: boolean;
    template_style: CertificateTemplateStyle;
    title_template: string;
    subtitle_template: string;
    description_template: string;
    signature_enabled: boolean;
    signature_name: string | null;
    signature_title: string | null;
    signature_image_url: string | null;
    logo_url: string | null;
    border_color: string;
    accent_color: string;
    // New fields for uploaded certificate template
    certificate_template_url: string | null;
    name_position_x: number;
    name_position_y: number;
    name_font_size: number;
    name_font_family: string;
    name_text_color: string;
    name_text_align: string;
    created_at: string; // timestamptz
    updated_at: string; // timestamptz
}

export interface IssuedCertificate {
    id: string; // uuid
    user_id: string; // uuid
    seed_id: string; // uuid
    room_id: string | null; // uuid
    completion_id: string | null; // uuid
    certificate_data: CertificateData; // JSONB
    certificate_url: string | null;
    certificate_key: string | null;
    issued_at: string; // timestamptz
    downloaded_at: string | null; // timestamptz
    download_count: number;
}

export interface CertificateData {
    student_name: string;
    seed_title: string;
    completion_date: string;
    instructor_name: string | null;
    template_style: CertificateTemplateStyle;
    title: string;
    subtitle: string;
    description: string;
    signature_enabled: boolean;
    signature_name: string | null;
    signature_title: string | null;
    signature_image_url: string | null;
    logo_url: string | null;
    border_color: string;
    accent_color: string;
}

// Leaderboard System Types

export interface LeaderboardEntry {
    user_id: string;
    username: string;
    full_name?: string;
    total_points: number;
    rank: number;
}

export interface PercentileData {
    total_points: number;
    percentile: number; // 0-100, where 100 is top performer
    rank: number;
    total_completers: number;
}
