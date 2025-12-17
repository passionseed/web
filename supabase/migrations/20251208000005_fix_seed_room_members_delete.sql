-- Add missing DELETE policy for seed_room_members
-- Users should be able to leave rooms (delete their own membership)

CREATE POLICY "Seed room members can delete their own membership" 
  ON seed_room_members FOR DELETE 
  USING (auth.uid() = user_id);

-- Also add UPDATE policy for completeness (though not currently used)
CREATE POLICY "Seed room members can update their own membership" 
  ON seed_room_members FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);