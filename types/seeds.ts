export interface Seed {
    id: string; // uuid
    map_id: string; // uuid
    title: string;
    description: string | null;
    cover_image_url: string | null;
    cover_image_blurhash: string | null;
    cover_image_key: string | null;
    cover_image_updated_at: string | null;
    created_by: string | null; // uuid
    created_at: string; // timestamptz
    updated_at: string; // timestamptz
}

export type SeedRoomStatus = 'waiting' | 'active' | 'completed';

export interface SeedRoom {
    id: string; // uuid
    seed_id: string; // uuid
    host_id: string; // uuid
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
