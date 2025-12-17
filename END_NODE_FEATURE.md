# End Node Feature Documentation

## Overview
The End Node feature allows seed creators to designate specific nodes as completion points. When a student reaches and completes an "End Node," a congratulations popup appears, marking the seed as finished while allowing continued exploration.

## Features

### 1. End Node Type
- New node type: `"end"` (in addition to `"learning"`, `"text"`, `"comment"`)
- Can be used with or without assessments
- Triggers completion tracking when reached

### 2. Completion Tracking
- **Database Table**: `seed_room_completions`
  - Tracks which students have completed which seed rooms
  - Links to the specific end node that was completed
  - Prevents duplicate completions (one per student per room)

### 3. Congratulations Modal
- Beautiful animated popup with:
  - Trophy icon and gradient effects
  - Celebration message
  - Seed title display
  - "Continue Exploring" button
- Appears on top of the map canvas
- Can be closed to continue working on the seed

### 4. Two Completion Modes

#### Mode 1: End Node with Assessment
- Create an end node with a quiz, checklist, or file upload
- Student must complete and submit the assessment
- Popup appears after successful submission/grading

#### Mode 2: End Node without Assessment
- Create an end node with just text/instructions (no assessment)
- Popup appears immediately when student clicks the node
- Useful for final congratulations or summary nodes

## Database Schema

### Migration: `20251211000001_add_end_node_type.sql`

**Table: `seed_room_completions`**
```sql
- id: uuid (primary key)
- room_id: uuid (references seed_rooms)
- user_id: uuid (references profiles)
- completed_at: timestamptz
- completed_node_id: uuid (references map_nodes)
- UNIQUE constraint on (room_id, user_id)
```

**Node Type Constraint**
```sql
CHECK (node_type IN ('learning', 'text', 'comment', 'end'))
```

## Implementation Details

### Files Modified/Created

1. **Database**
   - `supabase/migrations/20251211000001_add_end_node_type.sql` - Schema changes

2. **Types**
   - `types/map.ts` - Added `"end"` to node_type union
   - `types/seeds.ts` - Added `SeedRoomCompletion` interface
   - `components/map/MapViewer/types/index.ts` - Added seed room props

3. **Helper Functions**
   - `lib/supabase/seed-completion.ts` - Completion tracking utilities:
     - `markSeedRoomCompleted()` - Mark a seed as complete
     - `checkSeedRoomCompletion()` - Check if user completed a seed
     - `getSeedRoomCompletions()` - Get all completions (for mentors)
     - `isEndNode()` - Check if a node is an end node

4. **Components**
   - `components/seeds/SeedCompletionModal.tsx` - Congratulations popup
   - `components/map/MapViewer/index.tsx` - Completion detection logic
   - `app/seeds/room/[code]/page.tsx` - Pass seed context to MapViewer

### Completion Logic Flow

```
Student completes end node
    ↓
MapViewer detects completion via two paths:

Path A (With Assessment):
    1. Student submits assessment
    2. onProgressUpdate callback triggered
    3. Check if node type is "end"
    4. Check if status is "passed" or "submitted"
    5. Mark seed completed
    6. Show modal

Path B (Without Assessment):
    1. Student clicks end node
    2. onSelectionChange callback triggered
    3. Check if node type is "end"
    4. Check if no assessments exist
    5. Mark seed completed immediately
    6. Show modal
    ↓
Modal appears with congratulations
    ↓
Student can continue exploring or close modal
```

## Usage Guide

### For Seed Creators

1. **Create an End Node in the Map Editor**:
   - Add a new node to your seed map
   - Set the `node_type` to `"end"`
   - Name it something like "Completion" or "Congratulations"

2. **Choose Assessment Option**:
   - **With Assessment**: Add a quiz, checklist, or upload requirement
   - **Without Assessment**: Leave assessments empty for instant completion

3. **Add Content**:
   - Add congratulatory text/content to the node
   - Explain what the student has accomplished
   - Optionally link to next steps or related seeds

### For Students

1. **Complete the Seed**:
   - Progress through the seed nodes
   - Complete all required tasks
   - Reach the end node

2. **Trigger Completion**:
   - If end node has assessment: Submit and pass it
   - If no assessment: Simply click the end node

3. **See Congratulations**:
   - Modal appears with celebration
   - Progress is saved automatically
   - Can continue exploring the map

### For Mentors/Admins

- View completions in the seed room dashboard
- Track which students have finished
- See completion timestamps and nodes
- Use `getSeedRoomCompletions(roomId)` function

## Security & RLS Policies

The `seed_room_completions` table has Row Level Security enabled:

- **SELECT**: Users can view their own completions
- **INSERT**: Users can insert their own completions
- **SELECT (Mentors/Admins)**: Can view all completions for rooms they manage
- No UPDATE or DELETE policies (completions are immutable)

## Future Enhancements

Potential improvements:
- [ ] Add completion certificates/badges
- [ ] Show completion percentage in lobby
- [ ] Allow multiple end nodes per seed
- [ ] Add completion leaderboard
- [ ] Export completion reports for instructors
- [ ] Add confetti animation (requires `react-confetti` package)
- [ ] Custom completion messages per seed

## Testing

To test the End Node feature:

1. **Setup**:
   ```bash
   # Apply migration
   supabase db push --local
   ```

2. **Create Test Seed**:
   - Create a seed with a map
   - Add regular nodes
   - Add an end node (set node_type to "end")

3. **Test Completion**:
   - Join the seed room as a student
   - Complete all nodes
   - Complete the end node
   - Verify congratulations modal appears
   - Check database for completion record:
     ```sql
     SELECT * FROM seed_room_completions;
     ```

4. **Test Idempotency**:
   - Complete same end node again
   - Should not create duplicate completion
   - Modal should still show (if not already completed)

## Troubleshooting

**Modal doesn't appear:**
- Check browser console for errors
- Verify node_type is exactly "end" (check database)
- Ensure seed room ID and title are passed to MapViewer
- Check RLS policies allow insert

**Duplicate completions:**
- Should be prevented by UNIQUE constraint
- Check for unique constraint on (room_id, user_id)

**Wrong node triggers completion:**
- Verify only end nodes have node_type set to "end"
- Check isEndNode() function logic

## API Reference

### `markSeedRoomCompleted(roomId, userId, completedNodeId)`
Marks a seed room as completed for a user.

**Parameters:**
- `roomId` (string): UUID of the seed room
- `userId` (string): UUID of the user
- `completedNodeId` (string): UUID of the end node completed

**Returns:** `{ data, error }`

### `checkSeedRoomCompletion(roomId, userId)`
Checks if a user has completed a seed room.

**Parameters:**
- `roomId` (string): UUID of the seed room
- `userId` (string): UUID of the user

**Returns:** `{ completed: boolean, completion: SeedRoomCompletion | null }`

### `isEndNode(nodeType)`
Utility to check if a node is an end node.

**Parameters:**
- `nodeType` (string | undefined): The node type to check

**Returns:** `boolean`

---

**Version**: 1.0.0
**Date**: 2025-12-11
**Migration**: 20251211000001
