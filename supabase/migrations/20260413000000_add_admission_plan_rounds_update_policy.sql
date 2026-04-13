-- Add UPDATE RLS policy for admission_plan_rounds
-- Required for the reorder programs feature to work

CREATE POLICY "Users can update own plan rounds"
ON public.admission_plan_rounds
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM admission_plans
    WHERE admission_plans.id = admission_plan_rounds.plan_id
    AND admission_plans.user_id = auth.uid()
  )
);
