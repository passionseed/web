import { buildActivityCommentsByActivity } from "./activity-comments";

describe("buildActivityCommentsByActivity", () => {
  it("groups activity comments and nests replies with participant display names", () => {
    const result = buildActivityCommentsByActivity(
      [
        {
          id: "comment-1",
          activity_id: "activity-1",
          participant_id: "participant-1",
          content: "We are blocked on interviews.",
          engagement_score: 2,
          created_at: "2026-04-12T10:00:00.000Z",
          updated_at: "2026-04-12T10:00:00.000Z",
          is_edited: false,
          hackathon_participants: {
            name: "Alice Smith",
            display_name: "Alice",
            avatar_url: "https://example.com/alice.png",
          },
        },
        {
          id: "comment-2",
          activity_id: "activity-1",
          participant_id: "participant-2",
          content: "We tested with two users today.",
          engagement_score: 0,
          created_at: "2026-04-12T11:00:00.000Z",
          updated_at: "2026-04-12T11:05:00.000Z",
          is_edited: true,
          hackathon_participants: {
            name: "Bob Lee",
            display_name: null,
            avatar_url: null,
          },
        },
      ],
      [
        {
          id: "reply-1",
          comment_id: "comment-1",
          participant_id: "participant-3",
          content: "Try alumni instead of current students.",
          created_at: "2026-04-12T10:30:00.000Z",
          updated_at: "2026-04-12T10:30:00.000Z",
          is_edited: false,
          hackathon_participants: {
            name: "Carol Tan",
            display_name: "Carol",
            avatar_url: null,
          },
        },
      ]
    );

    expect(result["activity-1"]).toEqual([
      {
        id: "comment-1",
        activity_id: "activity-1",
        participant_id: "participant-1",
        participant_name: "Alice",
        participant_avatar_url: "https://example.com/alice.png",
        content: "We are blocked on interviews.",
        engagement_score: 2,
        created_at: "2026-04-12T10:00:00.000Z",
        updated_at: "2026-04-12T10:00:00.000Z",
        is_edited: false,
        replies: [
          {
            id: "reply-1",
            comment_id: "comment-1",
            participant_id: "participant-3",
            participant_name: "Carol",
            participant_avatar_url: null,
            content: "Try alumni instead of current students.",
            created_at: "2026-04-12T10:30:00.000Z",
            updated_at: "2026-04-12T10:30:00.000Z",
            is_edited: false,
          },
        ],
      },
      {
        id: "comment-2",
        activity_id: "activity-1",
        participant_id: "participant-2",
        participant_name: "Bob Lee",
        participant_avatar_url: null,
        content: "We tested with two users today.",
        engagement_score: 0,
        created_at: "2026-04-12T11:00:00.000Z",
        updated_at: "2026-04-12T11:05:00.000Z",
        is_edited: true,
        replies: [],
      },
    ]);
  });
});
