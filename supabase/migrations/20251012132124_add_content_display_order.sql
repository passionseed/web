-- Add display_order column to node_content for ordering content items
ALTER TABLE public.node_content
ADD COLUMN display_order integer NOT NULL DEFAULT 0;

-- Add comment explaining the column
COMMENT ON COLUMN public.node_content.display_order IS 'Determines the display order of content items within a node. Lower numbers appear first.';

-- Create index for efficient ordering queries
CREATE INDEX idx_node_content_display_order ON public.node_content(node_id, display_order);

-- Update existing content to have sequential order based on created_at
WITH ordered_content AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY node_id ORDER BY created_at) - 1 as order_num
  FROM public.node_content
)
UPDATE public.node_content
SET display_order = ordered_content.order_num
FROM ordered_content
WHERE public.node_content.id = ordered_content.id;
