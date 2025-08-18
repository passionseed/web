-- Migration: Add Admin Role Support
-- Created: 2025-08-18 12:00:00
-- Description: Adds admin role to user_roles table and creates admin-specific functionality

-- Update the user_roles table to include admin role
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Add new check constraint with admin role
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_role_check 
CHECK (role = ANY (ARRAY['student'::text, 'TA'::text, 'instructor'::text, 'admin'::text]));

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = user_uuid 
        AND role = 'admin'
    );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- Create admin activity log table for audit purposes
CREATE TABLE IF NOT EXISTS public.admin_activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL,
    target_user_id UUID REFERENCES auth.users(id),
    target_resource_type TEXT,
    target_resource_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on admin activity log
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view activity logs
CREATE POLICY "admins_view_activity_logs" ON public.admin_activity_log
    FOR SELECT 
    USING (public.is_admin(auth.uid()));

-- Only admins can insert activity logs
CREATE POLICY "admins_insert_activity_logs" ON public.admin_activity_log
    FOR INSERT 
    WITH CHECK (
        public.is_admin(auth.uid()) AND 
        admin_user_id = auth.uid()
    );

-- Create indexes for performance
CREATE INDEX idx_admin_activity_log_admin_user ON public.admin_activity_log(admin_user_id);
CREATE INDEX idx_admin_activity_log_target_user ON public.admin_activity_log(target_user_id);
CREATE INDEX idx_admin_activity_log_created_at ON public.admin_activity_log(created_at);
CREATE INDEX idx_admin_activity_log_action ON public.admin_activity_log(action);

-- Grant permissions
GRANT ALL ON TABLE public.admin_activity_log TO authenticated;

COMMENT ON TABLE public.admin_activity_log IS 'Logs admin actions for audit and security purposes';
COMMENT ON FUNCTION public.is_admin(UUID) IS 'Check if a user has admin role';