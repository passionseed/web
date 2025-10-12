-- UP Migration
ALTER TABLE public.node_content
ADD COLUMN content_title TEXT NULL;

-- Optional: Add a comment to the new column for clarity
COMMENT ON COLUMN public.node_content.content_title IS 'The title of the content, if applicable.';

-- DOWN Migration (for reverting the change)
-- ALTER TABLE public.node_content
-- DROP COLUMN content_title;
