-- Add 'order_code' to the allowed content types for node_content

-- Drop the existing constraint
ALTER TABLE public.node_content 
DROP CONSTRAINT IF EXISTS node_content_content_type_check;

-- Add the new constraint with 'order_code' included
ALTER TABLE public.node_content 
ADD CONSTRAINT node_content_content_type_check 
CHECK (content_type = ANY (ARRAY[
  'video'::text, 
  'canva_slide'::text, 
  'text'::text, 
  'image'::text, 
  'pdf'::text, 
  'resource_link'::text,
  'order_code'::text
]));
