import { Database } from '@/lib/supabase/database.types';

export type Community = Database['public']['Tables']['communities']['Row'] & {
  member_count: number;
  is_member?: boolean;
  member_role?: string;
  cover_image_url?: string | null;
  profile_image_url?: string | null;
};

export type CommunityMember = Database['public']['Tables']['user_communities']['Row'] & {
  profile?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
};

export type CommunityPost = Database['public']['Tables']['community_posts']['Row'] & {
  author: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
  media?: {
    id: string;
    url: string;
    type: string;
  }[];
  like_count: number;
  comment_count: number;
  is_liked: boolean;
};

export type PostComment = Database['public']['Tables']['post_comments']['Row'] & {
  author: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
};

export type CommunityProject = Database['public']['Tables']['community_projects']['Row'] & {
  created_by_user: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
  member_count: number;
  is_member: boolean;
};

export type CommunityMentor = Database['public']['Tables']['community_mentors']['Row'] & {
  user: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    bio: string | null;
  };
};

export type CreateCommunityInput = {
  name: string;
  description: string;
  short_description: string;
  is_public: boolean;
};

export type UpdateCommunityInput = {
  name?: string;
  description?: string;
  short_description?: string;
  is_public?: boolean;
};

export type CreatePostInput = {
  community_id: string;
  content: string;
  media_ids?: string[];
};

export type CreateCommentInput = {
  post_id: string;
  content: string;
  parent_id?: string;
};

export type JoinCommunityInput = {
  community_id: string;
  role?: 'member' | 'moderator' | 'admin' | 'owner';
};

export type CommunityFilters = {
  search?: string;
  is_member?: boolean;
  is_public?: boolean;
  sort_by?: 'newest' | 'popular' | 'name';
  page?: number;
  limit?: number;
};
