-- Explicitly grant permissions to service_role (fixes permission denied error)
GRANT ALL ON TABLE "public"."student_node_progress" TO "service_role";
GRANT ALL ON TABLE "public"."student_node_progress" TO "postgres";
GRANT ALL ON TABLE "public"."student_node_progress" TO "authenticated";

-- Ensure RLS is enabled
ALTER TABLE "public"."student_node_progress" ENABLE ROW LEVEL SECURITY;

-- 1. Service Role Bypass Policy
DROP POLICY IF EXISTS "Service role full access" ON "public"."student_node_progress";
CREATE POLICY "Service role full access" ON "public"."student_node_progress"
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 2. User Self-Management Policy
DROP POLICY IF EXISTS "Users can manage own progress" ON "public"."student_node_progress";
CREATE POLICY "Users can manage own progress" ON "public"."student_node_progress"
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. Room Membership Visibility Policy (Optional, but safe given we iterate rooms)
-- Allows viewing progress of others if you share a seed room (simplifies client fetching if needed later)
-- Keeping it strictly service-role for now to match implementation plan, so commented out.
-- CREATE POLICY "Room members can view room progress" ...
