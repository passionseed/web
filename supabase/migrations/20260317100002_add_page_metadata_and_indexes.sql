-- =====================================================
-- ADD PAGE METADATA AND PERFORMANCE INDEXES
-- Adds activity_count to path_days + indexes for query optimization
-- =====================================================

-- Add activity_count column to path_days (cached for performance)
ALTER TABLE public.path_days
  ADD COLUMN IF NOT EXISTS activity_count INT DEFAULT 0;

-- Backfill activity counts (batched to avoid long locks)
-- Run this manually in batches if you have >10K rows:
-- UPDATE path_days SET activity_count = (
--   SELECT COUNT(*) FROM path_activities WHERE path_day_id = path_days.id
-- ) WHERE id IN (SELECT id FROM path_days LIMIT 100);

-- For now, backfill all (safe for small datasets)
UPDATE public.path_days SET activity_count = (
  SELECT COUNT(*)
  FROM public.path_activities
  WHERE path_day_id = path_days.id
);

-- Create function to automatically update activity_count
CREATE OR REPLACE FUNCTION update_page_activity_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.path_days
    SET activity_count = activity_count + 1
    WHERE id = NEW.path_day_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.path_days
    SET activity_count = activity_count - 1
    WHERE id = OLD.path_day_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update activity_count
CREATE TRIGGER path_activities_count_trigger
  AFTER INSERT OR DELETE ON public.path_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_page_activity_count();

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- Optimize bulk activity fetching (prevent N+1 queries)
CREATE INDEX IF NOT EXISTS idx_path_activities_bulk_fetch
  ON public.path_activities(path_day_id, display_order)
  INCLUDE (title, activity_type, estimated_minutes, is_required);

-- Optimize path_content queries
CREATE INDEX IF NOT EXISTS idx_path_content_display_order
  ON public.path_content(activity_id, display_order);

-- Optimize path_assessments queries
CREATE INDEX IF NOT EXISTS idx_path_assessments_type_graded
  ON public.path_assessments(assessment_type, is_graded);

-- Optimize path_days queries by path_id
CREATE INDEX IF NOT EXISTS idx_path_days_path_id_day_number
  ON public.path_days(path_id, day_number);

-- Comments
COMMENT ON COLUMN public.path_days.activity_count IS 'Cached count of activities (updated via trigger)';
COMMENT ON FUNCTION update_page_activity_count() IS 'Automatically updates path_days.activity_count when activities are added/removed';
