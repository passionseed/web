export interface NPCAvatarData {
    id: string;
    seed_id: string;
    name: string;
    svg_data: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

export interface NPCAvatarCreate {
    seed_id: string;
    name: string;
    svg_data: string;
    description?: string;
}

export interface NPCAvatarUpdate {
    name?: string;
    svg_data?: string;
    description?: string;
}
