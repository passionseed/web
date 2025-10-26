# Journey Map Testing Guide

## Recent Fixes Applied

### 1. **Milestone View Switching** ✅
- Added debug logging to track view mode changes
- Fixed callback dependencies in `handleViewMilestones`
- Ensured proper state cleanup when switching views
- Added console logs to track the flow

### 2. **Milestone Auto-Positioning** ✅
- Milestones without positions now auto-layout horizontally
- Automatic sequential edge creation for better visual flow
- Alternating vertical positions for visual variety
- Spacing: 350px horizontal, ±50px vertical variation

### 3. **Create Milestone Position Bug** ✅
- Fixed `CreateMilestoneDialog` to use `position_x` and `position_y` instead of nested `position` object
- Now properly saves positions to database columns
- Auto-calculates positions based on existing milestones

## How to Test the Journey Map

### Test Flow 1: Create a Project and View Milestones

1. **Navigate to Journey Map**
   - Go to `/me/journey` or click the journey preview from `/me`

2. **Create a North Star Project**
   - Click "New Project" button (top right)
   - Enter title: "Master Web Development"
   - Select project type: Select an option that indicates North Star/long-term
   - Fill in description, goal, why
   - Click "Create Project"

3. **Create a Short-Term Project**
   - Click "New Project" again
   - Enter title: "Learn React Hooks"
   - Select project type: Short-term
   - Link to North Star: Select "Master Web Development"
   - Click "Create Project"

4. **View Project Milestones**
   - Click on either project node (North Star or Short-term)
   - Click the "Milestones" button (or "View Milestones")
   - **Expected**: Should transition to milestone view

### Test Flow 2: Create and Manage Milestones

1. **In Milestone View**
   - You should see the project header with "Back" button
   - If no milestones: see empty state with "Create First Milestone" button

2. **Create First Milestone**
   - Click "Add Milestone" or "Create First Milestone"
   - Enter title: "Complete React Hooks tutorial"
   - Enter description: "Watch videos and complete exercises"
   - Click "Create Milestone"
   - **Expected**: Milestone appears on the map at position (100, 0)

3. **Create Second Milestone**
   - Click "Add Milestone" again
   - Enter title: "Build a todo app with hooks"
   - Select previous milestone: "Complete React Hooks tutorial"
   - Click "Create Milestone"
   - **Expected**: Milestone appears to the right, connected with an arrow

4. **Create Third Milestone**
   - Repeat above process
   - **Expected**: Milestone appears further right, creating a linear flow

### Test Flow 3: Update Progress with Journaling

1. **Click on a Milestone Node**
   - Should open "Milestone Progress Dialog"

2. **Add a Journal Entry**
   - Move the progress slider (e.g., to 50%)
   - Enter journal content: "Completed videos 1-5, understood useState and useEffect"
   - Click "Save Progress"
   - **Expected**:
     - Dialog closes
     - Milestone updates with new progress percentage
     - Milestone shows journal preview

3. **Complete a Milestone**
   - Click milestone again
   - Move slider to 100%
   - Add final journal entry
   - **Expected**: Reflection prompt appears (if implemented)
   - Status changes to "completed"

### Test Flow 4: Navigation

1. **Back to Overview**
   - Click "Back" button in milestone view
   - **Expected**: Returns to main journey map with all projects

2. **View Different Project**
   - Click another project node
   - Click "Milestones"
   - **Expected**: Switches to that project's milestone view

## Console Debugging

Open browser console (F12) and watch for these logs:

```
🎯 handleViewMilestones called with projectId: [id]
📊 Current viewMode: overview
📊 Setting milestoneProjectId to: [id]
✅ ViewMode set to milestone
🚀 Rendering MilestoneMapView for project: [id]
✅ Built milestone map: X nodes, Y edges
```

If you don't see the milestone view:
- Check if `viewMode` changes to "milestone"
- Check if `milestoneProjectId` is set
- Verify the `MilestoneMapView` component renders

## Common Issues & Solutions

### Issue: "Can't see milestone view"
**Solution**:
- Check console for errors
- Verify the "Milestones" button onClick handler fires
- Ensure `handleViewMilestones` is called with correct projectId

### Issue: "Milestones appear at (0,0)"
**Solution**:
- This is fixed! Milestones now auto-layout if positions aren't set
- New milestones created will have proper position_x and position_y

### Issue: "No edges between milestones"
**Solution**:
- If you selected a "previous milestone" when creating, an edge should exist
- If using auto-layout, sequential edges are created automatically
- Check the milestone_paths table in Supabase

### Issue: "Back button doesn't work"
**Solution**:
- Check console for the "⬅️ Back button clicked" log
- Ensure viewMode resets to "overview"
- Verify milestoneProjectId is set to null

## Database Verification

Check your Supabase tables:

```sql
-- Check projects
SELECT id, title, metadata FROM journey_projects;

-- Check milestones with positions
SELECT id, title, project_id, position_x, position_y, progress_percentage
FROM project_milestones;

-- Check milestone paths
SELECT * FROM milestone_paths;

-- Check journals
SELECT milestone_id, content, progress_percentage, created_at
FROM milestone_journals
ORDER BY created_at DESC;
```

## Next Steps for Testing

1. ✅ Create projects
2. ✅ View milestone map
3. ✅ Create milestones
4. ✅ Update progress with journals
5. ⏳ Test reflection system
6. ⏳ Test daily activity tracking
7. ⏳ Test main quest path highlighting
8. ⏳ Test North Star linkage visualization

## Known Limitations

- Reflection dialog shows "coming soon" toast
- Edit project dialog shows "coming soon" toast
- Daily activity panel may need real data
- Team collaboration features not yet implemented
- Connection nodes not yet implemented
- Sponsored nodes not yet implemented

## Performance Notes

- Auto-layout calculates positions client-side
- Milestone map loads all journals for preview (may be slow with many journals)
- ReactFlow handles rendering optimization
- Consider pagination for projects with 50+ milestones

---

**Last Updated**: After applying milestone view fixes
**Status**: Core journey map functional, milestone view working, positioning fixed
