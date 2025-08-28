# Assignment Groups Integration Guide

This guide explains how to integrate the new assignment groups feature into your existing Assignments page.

## Database Migration

First, run the database migration to create the group tables:

```sql
-- The migration file is already created at:
-- supabase/migrations/20250824100000_add_assignment_groups.sql

-- Run with:
npx supabase db push
```

## Components Created

### Core Components
- `CreateGroupModal.tsx` - Modal for creating new assignment groups
- `GroupManagement.tsx` - Main component for managing groups and members
- `AddStudentToGroupModal.tsx` - Modal for adding students to groups
- `AssignGroupAssignmentModal.tsx` - Modal for assigning assignments to groups
- `GroupAssignmentTab.tsx` - Tab component for the assignments page

### API Functions
- `lib/supabase/assignment-groups.ts` - All database operations for groups

### Type Definitions
- Added to `types/classroom.ts` - TypeScript interfaces for groups

## Integration Steps

### 1. Update Assignments Page

Add the group assignment tab to your assignments page. Here's how to modify your assignments page:

```typescript
// In your assignments page component (e.g., app/classroom/[id]/assignments/page.tsx)

import { GroupAssignmentTab } from "@/components/classroom/GroupAssignmentTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Add the tabs structure:
<Tabs defaultValue="individual" className="w-full">
  <TabsList className="grid w-full grid-cols-2">
    <TabsTrigger value="individual">Individual Assignments</TabsTrigger>
    <TabsTrigger value="groups">Group Assignments</TabsTrigger>
  </TabsList>
  
  <TabsContent value="individual">
    {/* Your existing assignments content */}
  </TabsContent>
  
  <TabsContent value="groups">
    <GroupAssignmentTab 
      classroomId={classroomId} 
      userRole={userRole}
    />
  </TabsContent>
</Tabs>
```

### 2. Navigation Update

You can also add a direct navigation item to group assignments:

```typescript
// In your classroom navigation
{
  title: "Group Assignments",
  href: `/classroom/${classroomId}/assignments?tab=groups`,
  icon: Users,
  description: "Manage collaborative assignments",
  roles: ["instructor", "ta"], // Only show to instructors/TAs
}
```

## Features Provided

### For Instructors/TAs:
1. **Create Groups** - Create assignment groups with colors and member limits
2. **Manage Members** - Add/remove students from groups with roles (leader/member)
3. **Assign Assignments** - Assign existing assignments to specific groups
4. **Custom Instructions** - Add group-specific instructions for assignments
5. **Custom Due Dates** - Set different due dates for group assignments

### For Students:
1. **View Groups** - See all groups they belong to
2. **Group Assignments** - View assignments assigned to their groups
3. **Team Collaboration** - See team members and their roles
4. **Join Groups** - Self-join available groups (if enabled)

## Database Features

### Automatic Enrollment
- When an assignment is assigned to a group, all group members are automatically enrolled
- When a new member joins a group, they're automatically enrolled in all group assignments

### Row Level Security
- Students can only see groups in their classrooms
- Students can only join groups if there's space and they're classroom members
- Instructors/TAs can manage all groups in their classrooms

### Audit Trail
- Tracks who added members to groups
- Tracks who created assignments and when
- Maintains join dates and role history

## UI/UX Features

### Group Management
- Color-coded groups for easy identification
- Member count indicators and capacity limits
- Role badges (leader/member) with crown icons
- Responsive grid layout for groups

### Assignment Display
- Due date indicators with color coding (overdue/due soon/future)
- Group-specific instructions display
- Assignment status tracking
- Member list with profile information

### Accessibility
- Keyboard navigation support
- Screen reader friendly labels
- High contrast color scheme
- Loading states and error handling

## Usage Examples

### Creating a Group
1. Go to Assignments → Group Assignments → Manage Groups
2. Click "Create Group"
3. Enter group name, description, color, and max members
4. Click "Create Group"

### Adding Students
1. Find the group in the list
2. Click the three-dot menu → "Add Student"
3. Search and select students
4. Choose their role (member/leader)
5. Click "Add Students"

### Assigning to Groups
1. Click the three-dot menu on a group → "Assign Assignment"
2. Select an existing assignment
3. Optional: Set custom due date and instructions
4. Click "Assign to Group"

## Best Practices

### Group Sizes
- Keep groups between 2-6 members for optimal collaboration
- Use the max_members limit to prevent overcrowding

### Role Management
- Assign 1-2 leaders per group
- Leaders can help coordinate group work
- All members have equal access to assignments

### Assignment Strategy
- Create assignments first, then assign to groups
- Use group-specific instructions for tailored guidance
- Set appropriate due dates considering group coordination needs

## Troubleshooting

### Common Issues
1. **Students can't join groups** - Check classroom membership and group capacity
2. **Assignments not showing** - Verify RLS policies and group membership
3. **Permission denied** - Ensure user has correct role in classroom

### Debug Steps
1. Check browser console for errors
2. Verify database policies with Supabase dashboard
3. Test with different user roles
4. Check network requests in DevTools

## Future Enhancements

Potential features to add:
- Group chat/messaging
- File sharing within groups  
- Peer evaluation system
- Group progress tracking
- Advanced group formation algorithms
- Group assignment templates