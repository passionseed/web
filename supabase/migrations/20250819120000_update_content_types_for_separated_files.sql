-- Update content_type constraint to support separated text, image, and PDF types
-- This replaces 'text_with_images' with 'text', 'image', and 'pdf'

-- First, drop the existing constraint
ALTER TABLE public.node_content 
DROP CONSTRAINT IF EXISTS node_content_content_type_check;

-- Update any existing 'text_with_images' records to 'text' type BEFORE adding the constraint
-- This is a data migration step if there are existing records
UPDATE public.node_content 
SET content_type = 'text' 
WHERE content_type = 'text_with_images';

-- Update any other invalid content types to valid ones
UPDATE public.node_content 
SET content_type = 'text' 
WHERE content_type NOT IN ('video', 'canva_slide', 'text', 'image', 'pdf', 'resource_link');

-- Now add the constraint after data is cleaned
ALTER TABLE public.node_content 
ADD CONSTRAINT node_content_content_type_check 
CHECK (content_type = ANY (ARRAY['video'::text, 'canva_slide'::text, 'text'::text, 'image'::text, 'pdf'::text, 'resource_link'::text]));