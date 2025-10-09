-- Add per-topic ratings and reflection fields to mindmap_topics
-- This allows each topic to have individual ratings instead of just overall averages

ALTER TABLE public.mindmap_topics
ADD COLUMN IF NOT EXISTS satisfaction_rating integer CHECK (satisfaction_rating >= 0 AND satisfaction_rating <= 100),
ADD COLUMN IF NOT EXISTS progress_rating integer CHECK (progress_rating >= 0 AND progress_rating <= 100),
ADD COLUMN IF NOT EXISTS challenge_rating integer CHECK (challenge_rating >= 0 AND challenge_rating <= 100),
ADD COLUMN IF NOT EXISTS reflection_why text;

-- Add helpful comments to document the schema
COMMENT ON COLUMN public.mindmap_topics.notes IS 'Updates/notes about what the user worked on for this topic';
COMMENT ON COLUMN public.mindmap_topics.satisfaction_rating IS 'How satisfied the user felt about this topic (0-100)';
COMMENT ON COLUMN public.mindmap_topics.progress_rating IS 'How much progress the user made on this topic (0-100)';
COMMENT ON COLUMN public.mindmap_topics.challenge_rating IS 'How challenging this topic was (0-100)';
COMMENT ON COLUMN public.mindmap_topics.reflection_why IS 'Why the user felt this way about their ratings for this topic';

COMMENT ON COLUMN public.mindmap_reflections.overall_reflection IS 'Overall reflection about the entire day (optional - individual topic reflections are stored in mindmap_topics)';
COMMENT ON COLUMN public.mindmap_reflections.satisfaction_rating IS 'Average satisfaction rating across all topics';
COMMENT ON COLUMN public.mindmap_reflections.progress_rating IS 'Average progress rating across all topics';
COMMENT ON COLUMN public.mindmap_reflections.challenge_rating IS 'Average challenge rating across all topics';
