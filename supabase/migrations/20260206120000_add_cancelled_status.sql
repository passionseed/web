-- Drop the existing check constraint
ALTER TABLE ps_requests DROP CONSTRAINT IF EXISTS ps_requests_status_check;

-- Add the new check constraint including 'cancelled'
ALTER TABLE ps_requests ADD CONSTRAINT ps_requests_status_check 
CHECK (status IN ('pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled'));
