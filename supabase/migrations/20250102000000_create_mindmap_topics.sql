-- Create mindmap_topics table to store individual topic bubbles
CREATE TABLE IF NOT EXISTS "public"."mindmap_topics" (
    "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    "user_id" uuid NOT NULL,
    "text" text NOT NULL,
    "position_x" numeric NOT NULL,
    "position_y" numeric NOT NULL,
    "notes" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "mindmap_topics_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "public"."mindmap_topics"
    ADD CONSTRAINT "mindmap_topics_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE "public"."mindmap_topics" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own mindmap topics" ON "public"."mindmap_topics"
    FOR ALL USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON table "public"."mindmap_topics" TO "authenticated";

-- Create index for better performance
CREATE INDEX "mindmap_topics_user_id_idx" ON "public"."mindmap_topics" USING btree ("user_id");

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_mindmap_topics_updated_at 
    BEFORE UPDATE ON public.mindmap_topics 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();