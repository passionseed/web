# Testing End Node Feature

## What I Fixed

1. **Completion Detection Logic**: Changed from a callback approach to a `useEffect` that watches for `progressMap` changes
2. **Modal Positioning**: Moved modal outside the ResizablePanel structure using React Fragment
3. **Added Extensive Logging**: Console logs will show exactly what's happening

## How to Test

### Step 1: Create a Test Seed with End Node

1. Open your seed map in **edit mode**
2. Create or select a node at the end of your map
3. In the **Details tab**, set **Node Type** to **"🏁 End Node (Completion)"**
4. **Option A**: Add a simple checklist assessment
   - Go to Assessment tab
   - Add a checklist with 1-2 items
   **OR**
   **Option B**: Leave it without assessment (instant completion)

### Step 2: Join Seed Room as Student

1. Create a seed room with your map
2. Join the room
3. Navigate through the nodes to the end node

### Step 3: Complete the End Node

**If it has an assessment:**
- Click the end node
- Complete the checklist/quiz
- Submit

**If no assessment:**
- Simply click the end node

### Step 4: Check What Happens

**You should see:**
1. **Console logs** (press F12 to open dev tools):
   ```
   🔄 [MapViewer] handleProgressUpdate called - reloading progress
   🔍 [MapViewer] Progress map updated, checking for end node completion
   🏁 [MapViewer] This is an END NODE!
   📊 [MapViewer] Node progress: {status: "passed", ...}
   ✅ [MapViewer] Is node completed? true
   🎉 [MapViewer] End node completed! Marking seed as complete
   ✅ [MapViewer] Seed marked as complete, showing modal
   ```

2. **Congratulations popup** should appear with:
   - Trophy icon
   - Seed title
   - "Continue Exploring" button

## Debugging If Nothing Happens

### Check Console Logs

Look for these specific logs to diagnose:

**1. Is the end node detected?**
```
🏁 [MapViewer] This is an END NODE!
```
❌ If you DON'T see this:
- Check the node type is exactly `"end"` in the database
- Verify you're in a seed room (not regular map view)

**2. Is progress being recorded?**
```
📊 [MapViewer] Node progress: {...}
```
❌ If progress is `undefined` or `null`:
- Assessment might not have been submitted
- Check if submission succeeded

**3. Is completion being checked?**
```
✅ [MapViewer] Is node completed? true
```
❌ If this is `false`:
- For nodes WITH assessment: Status must be "passed" or "submitted"
- Check what the actual status is in the console

**4. Are there errors?**
```
❌ [MapViewer] Error marking seed complete: {...}
```
❌ If you see errors:
- Check RLS policies allow insert to `seed_room_completions`
- Verify user is authenticated
- Check database permissions

### Manual Database Check

If still not working, check the database directly:

```sql
-- Check if table exists
SELECT * FROM seed_room_completions LIMIT 1;

-- Check node type
SELECT id, title, node_type FROM map_nodes WHERE node_type = 'end';

-- Check progress
SELECT * FROM student_node_progress WHERE node_id = 'YOUR_END_NODE_ID';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'seed_room_completions';
```

### Common Issues

**Issue: "Not an end node" message**
- **Solution**: Set node type to exactly `"end"` (lowercase) in database
- Check: `SELECT node_type FROM map_nodes WHERE id = 'YOUR_NODE_ID';`

**Issue: Progress is null**
- **Solution**: Make sure assessment was submitted successfully
- Check: Student must submit AND instructor must grade (or auto-grade)

**Issue: Modal doesn't appear but logs say it should**
- **Solution**: Check browser console for React errors
- Verify modal component is imported correctly

**Issue: "Already completed" immediately**
- **Solution**: Check `seed_room_completions` table - user might have already completed
- Clear: `DELETE FROM seed_room_completions WHERE user_id = 'USER_ID';`

## Expected Console Output (Success)

Here's what a successful completion looks like:

```
🔄 [MapViewer] handleProgressUpdate called - reloading progress
🔍 [MapViewer] Progress map updated, checking for end node completion {
  hasSeedRoomId: true,
  hasCurrentUser: true,
  hasSelectedNode: true,
  hasCompletedSeed: false,
  nodeType: "end",
  progressMapSize: 5
}
🏁 [MapViewer] This is an END NODE!
📊 [MapViewer] Node progress: {
  id: "...",
  user_id: "...",
  node_id: "...",
  status: "passed",
  submitted_at: "2025-12-11T..."
}
✅ [MapViewer] Is node completed? true
🎉 [MapViewer] End node completed! Marking seed as complete
✅ [MapViewer] Seed marked as complete, showing modal
```

## Database Schema Reference

```sql
-- Verify completion was recorded
SELECT
  src.*,
  p.full_name,
  sr.seed_id,
  mn.title as completed_node_title
FROM seed_room_completions src
JOIN profiles p ON p.id = src.user_id
JOIN seed_rooms sr ON sr.id = src.room_id
JOIN map_nodes mn ON mn.id = src.completed_node_id
ORDER BY src.completed_at DESC;
```

## Quick Test Checklist

- [ ] Migration applied: `20251211000001_add_end_node_type.sql`
- [ ] Node type set to `"end"` in database
- [ ] Golden trophy badge visible on end node
- [ ] In a seed room (not regular map)
- [ ] Assessment completed (if node has one)
- [ ] Console shows "🏁 This is an END NODE!"
- [ ] Console shows completion status
- [ ] Modal appears
- [ ] Database record created in `seed_room_completions`

---

**Still having issues?** Share the console logs and I can help debug further!
