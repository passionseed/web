-- Create mindmap_reflections table to store complete mindmap reflection sessions
CREATE TABLE IF NOT EXISTS "public"."mindmap_reflections" (
    "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    "user_id" uuid NOT NULL,
    "satisfaction_rating" integer NOT NULL CHECK (satisfaction_rating >= 0 AND satisfaction_rating <= 100),
    "progress_rating" integer NOT NULL CHECK (progress_rating >= 0 AND progress_rating <= 100),
    "challenge_rating" integer NOT NULL CHECK (challenge_rating >= 0 AND challenge_rating <= 100),
    "overall_reflection" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "mindmap_reflections_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "public"."mindmap_reflections"
    ADD CONSTRAINT "mindmap_reflections_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Update mindmap_topics to link to reflections
ALTER TABLE "public"."mindmap_topics"
    ADD COLUMN "reflection_id" uuid;

ALTER TABLE "public"."mindmap_topics"
    ADD CONSTRAINT "mindmap_topics_reflection_id_fkey" 
    FOREIGN KEY ("reflection_id") REFERENCES "public"."mindmap_reflections"("id") ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE "public"."mindmap_reflections" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own mindmap reflections" ON "public"."mindmap_reflections"
    FOR ALL USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON table "public"."mindmap_reflections" TO "authenticated";

-- Create index for better performance
CREATE INDEX "mindmap_reflections_user_id_idx" ON "public"."mindmap_reflections" USING btree ("user_id");
CREATE INDEX "mindmap_reflections_created_at_idx" ON "public"."mindmap_reflections" USING btree ("created_at" DESC);

-- Add updated_at trigger
CREATE TRIGGER update_mindmap_reflections_updated_at 
    BEFORE UPDATE ON public.mindmap_reflections 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();