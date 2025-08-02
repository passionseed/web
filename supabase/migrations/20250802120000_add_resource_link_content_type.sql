-- Add 'resource_link' to the content_type constraint
ALTER TABLE public.node_content 
DROP CONSTRAINT IF EXISTS node_content_content_type_check;

ALTER TABLE public.node_content 
ADD CONSTRAINT node_content_content_type_check 
CHECK (content_type = ANY (ARRAY['video'::text, 'canva_slide'::text, 'text_with_images'::text, 'resource_link'::text]));
