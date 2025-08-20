-- Add checklist assessment type to the node_assessments table
ALTER TABLE public.node_assessments
DROP CONSTRAINT IF EXISTS node_assessments_assessment_type_check;

ALTER TABLE public.node_assessments
ADD CONSTRAINT node_assessments_assessment_type_check
CHECK (
  assessment_type = ANY (
    ARRAY[
      'quiz'::text,
      'text_answer'::text,
      'image_upload'::text,
      'file_upload'::text,
      'checklist'::text
    ]
  )
);