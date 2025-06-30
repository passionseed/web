import { createClient } from "@/utils/supabase/client";
import {
  Community,
  CommunityFilters,
  CreateCommunityInput,
  UpdateCommunityInput,
  CreatePostInput,
  CreateCommentInput,
  JoinCommunityInput,
} from "@/types/community";

export const COMMUNITY_PAGE_SIZE = 10;

// Initialize Supabase client
const supabase = createClient();

// Community CRUD operations
export const createCommunity = async (
  input: CreateCommunityInput
): Promise<Community> => {
  const { data, error } = await supabase
    .from("communities")
    .insert({
      ...input,
      member_count: 1,
    })
    .select("*")
    .single();

  if (error) throw error;

  // Automatically add the creator as an admin
  await joinCommunity({
    community_id: data.id,
    role: "owner",
  });

  return data as Community;
};

export const updateCommunity = async (
  id: string,
  input: UpdateCommunityInput
): Promise<Community> => {
  const { data, error } = await supabase
    .from("communities")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Community;
};

export const getCommunity = async (id: string): Promise<Community | null> => {
  const { data, error } = await supabase
    .from("communities")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as Community;
};

export const getCommunityBySlug = async (
  slug: string
): Promise<Community | null> => {
  const { data, error } = await supabase
    .from("communities")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data as Community;
};

export const listCommunities = async (filters: CommunityFilters = {}) => {
  let query = supabase.from("communities").select("*", { count: "exact" });

  // Apply filters
  if (filters.search) {
    query = query.ilike("name", `%${filters.search}%`);
  }

  if (filters.is_public !== undefined) {
    query = query.eq("is_public", filters.is_public);
  }

  // Handle member filter
  if (filters.is_member !== undefined) {
    const { data: memberships } = await supabase
      .from("user_communities")
      .select("community_id")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id);

    const communityIds = memberships?.map((m) => m.community_id) || [];

    if (filters.is_member) {
      query = query.in("id", communityIds);
    } else {
      query = query.not("id", "in", `(${communityIds.join(",")})`);
    }
  }

  // Apply sorting
  if (filters.sort_by === "newest") {
    query = query.order("created_at", { ascending: false });
  } else if (filters.sort_by === "popular") {
    query = query.order("member_count", { ascending: false });
  } else {
    query = query.order("name", { ascending: true });
  }

  // Apply pagination
  const page = filters.page || 1;
  const limit = filters.limit || COMMUNITY_PAGE_SIZE;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await query.range(from, to);

  if (error) throw error;

  return {
    data: data as Community[],
    count: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  };
};

// Membership operations
export const joinCommunity = async (input: JoinCommunityInput) => {
  const { data: existing, error: checkError } = await supabase
    .from("user_communities")
    .select("*")
    .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
    .eq("community_id", input.community_id)
    .single();

  if (checkError && checkError.code !== "PGRST116") {
    throw checkError;
  }

  if (existing) {
    // Already a member, update role if needed
    if (input.role && input.role !== existing.role) {
      const { data, error } = await supabase
        .from("user_communities")
        .update({ role: input.role })
        .eq("id", existing.id)
        .select("*")
        .single();

      if (error) throw error;
      return data;
    }
    return existing;
  }

  // Not a member, create new membership
  const { data, error } = await supabase
    .from("user_communities")
    .insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      community_id: input.community_id,
      role: input.role || "member",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
};

export const leaveCommunity = async (communityId: string) => {
  const { error } = await supabase
    .from("user_communities")
    .delete()
    .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
    .eq("community_id", communityId);

  if (error) throw error;
  return true;
};

// Post operations
export const createPost = async (input: CreatePostInput) => {
  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      community_id: input.community_id,
      author_id: (await supabase.auth.getUser()).data.user?.id,
      content: input.content,
      type: "text",
    })
    .select("*")
    .single();

  if (error) throw error;

  // Handle media attachments if any
  if (input.media_ids && input.media_ids.length > 0) {
    await supabase
      .from("post_media")
      .update({ post_id: data.id })
      .in("id", input.media_ids);
  }

  return data;
};

export const getPost = async (postId: string) => {
  const { data, error } = await supabase
    .from("community_posts")
    .select(
      `
      *,
      author:profiles(id, username, full_name, avatar_url),
      media:post_media(id, url, type),
      like_count:post_likes(count),
      comment_count:post_comments(count),
      is_liked:post_likes!inner(user_id)
    `
    )
    .eq("id", postId)
    .eq("post_likes.user_id", (await supabase.auth.getUser()).data.user?.id)
    .single();

  if (error) return null;

  // Format the response
  const post = {
    ...data,
    like_count: data.like_count?.[0]?.count || 0,
    comment_count: data.comment_count?.[0]?.count || 0,
    is_liked: !!data.is_liked,
  };

  return post as any;
};

export const listCommunityPosts = async (
  communityId: string,
  page = 1,
  limit = 10
) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from("community_posts")
    .select(
      `
      *,
      author:profiles(id, username, full_name, avatar_url),
      media:post_media(id, url, type),
      like_count:post_likes(count),
      comment_count:post_comments(count),
      is_liked:post_likes!inner(user_id)
      `,
      { count: "exact" }
    )
    .eq("community_id", communityId)
    .eq("post_likes.user_id", (await supabase.auth.getUser()).data.user?.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  // Format the response
  const posts = data.map((post) => ({
    ...post,
    like_count: post.like_count?.[0]?.count || 0,
    comment_count: post.comment_count?.[0]?.count || 0,
    is_liked: !!post.is_liked,
  }));

  return {
    data: posts,
    count: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  };
};

// Comment operations
export const createComment = async (input: CreateCommentInput) => {
  const { data, error } = await supabase
    .from("post_comments")
    .insert({
      post_id: input.post_id,
      author_id: (await supabase.auth.getUser()).data.user?.id,
      content: input.content,
      parent_id: input.parent_id,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
};

export const listPostComments = async (postId: string) => {
  const { data, error } = await supabase
    .from("post_comments")
    .select(
      `
      *,
      author:profiles(id, username, full_name, avatar_url)
      `
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
};

// Like operations
export const toggleLike = async (postId: string) => {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("Not authenticated");

  // Check if already liked
  const { data: existing, error: checkError } = await supabase
    .from("post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    // Unlike
    const { error } = await supabase
      .from("post_likes")
      .delete()
      .eq("id", existing.id);

    if (error) throw error;
    return { liked: false };
  } else {
    // Like
    const { error } = await supabase.from("post_likes").insert({
      post_id: postId,
      user_id: userId,
    });

    if (error) throw error;
    return { liked: true };
  }
};
