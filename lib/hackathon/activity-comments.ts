export interface CommentAuthor {
  id: string;
  name: string;
  avatar_url: string | null;
}

export interface ActivityCommentReply {
  id: string;
  comment_id: string;
  participant_id: string;
  participant_name: string;
  participant_avatar_url: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
}

export interface ActivityComment {
  id: string;
  activity_id: string;
  participant_id: string;
  participant_name: string;
  participant_avatar_url: string | null;
  content: string;
  engagement_score: number;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  replies: ActivityCommentReply[];
}

interface ParticipantRelation {
  name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
}

export interface ActivityCommentRecord {
  id: string;
  activity_id: string;
  participant_id: string;
  content: string;
  engagement_score?: number | null;
  created_at: string;
  updated_at: string;
  is_edited?: boolean | null;
  hackathon_participants?: ParticipantRelation | ParticipantRelation[] | null;
}

export interface ActivityCommentReplyRecord {
  id: string;
  comment_id: string;
  participant_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_edited?: boolean | null;
  hackathon_participants?: ParticipantRelation | ParticipantRelation[] | null;
}

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function normalizeAuthor(
  participantId: string,
  participant: ParticipantRelation | ParticipantRelation[] | null | undefined
): CommentAuthor {
  const resolved = pickOne(participant);
  return {
    id: participantId,
    name: resolved?.display_name?.trim() || resolved?.name?.trim() || "Anonymous participant",
    avatar_url: resolved?.avatar_url ?? null,
  };
}

export function buildActivityCommentsByActivity(
  comments: ActivityCommentRecord[],
  replies: ActivityCommentReplyRecord[]
): Record<string, ActivityComment[]> {
  const repliesByCommentId = new Map<string, ActivityCommentReply[]>();

  for (const reply of replies) {
    const author = normalizeAuthor(reply.participant_id, reply.hackathon_participants);
    const existing = repliesByCommentId.get(reply.comment_id) ?? [];
    existing.push({
      id: reply.id,
      comment_id: reply.comment_id,
      participant_id: reply.participant_id,
      participant_name: author.name,
      participant_avatar_url: author.avatar_url,
      content: reply.content,
      created_at: reply.created_at,
      updated_at: reply.updated_at,
      is_edited: Boolean(reply.is_edited),
    });
    repliesByCommentId.set(reply.comment_id, existing);
  }

  for (const replyGroup of repliesByCommentId.values()) {
    replyGroup.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  const commentsByActivity: Record<string, ActivityComment[]> = {};

  for (const comment of comments) {
    const author = normalizeAuthor(comment.participant_id, comment.hackathon_participants);
    const activityComments = commentsByActivity[comment.activity_id] ?? [];

    activityComments.push({
      id: comment.id,
      activity_id: comment.activity_id,
      participant_id: comment.participant_id,
      participant_name: author.name,
      participant_avatar_url: author.avatar_url,
      content: comment.content,
      engagement_score: comment.engagement_score ?? 0,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      is_edited: Boolean(comment.is_edited),
      replies: repliesByCommentId.get(comment.id) ?? [],
    });

    commentsByActivity[comment.activity_id] = activityComments;
  }

  for (const activityId of Object.keys(commentsByActivity)) {
    commentsByActivity[activityId].sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  return commentsByActivity;
}
