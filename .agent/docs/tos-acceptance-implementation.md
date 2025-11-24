# TOS Acceptance Implementation

## Overview
Implemented a global Terms of Service (TOS) acceptance modal that appears for users who haven't accepted the current version of the TOS. This ensures all users are aware of and agree to the platform's terms before using it.

## Changes Made

### 1. Database Migration
**File**: `supabase/migrations/20251124000000_add_tos_acceptance.sql`

Added two new columns to the `profiles` table:
- `tos_accepted_at` (TIMESTAMP WITH TIME ZONE): Tracks when the user last accepted the TOS
- `tos_version` (TEXT): Stores the version of TOS that was accepted (e.g., "2025-01-24")

Also created an index for efficient lookups of users who haven't accepted TOS.

### 2. TOS Acceptance Modal Component
**File**: `components/TOSAcceptanceModal.tsx`

Created a non-dismissible modal that:
- Automatically checks if the current user has accepted the latest TOS version
- Displays the full Terms of Service content in a scrollable area
- Requires users to check a confirmation checkbox before accepting
- Updates the user's profile with acceptance timestamp and version
- Cannot be closed until the user accepts (prevents ESC key and outside clicks)

**Key Features**:
- Version tracking (currently set to "2025-01-24")
- Full TOS content with 10 sections covering:
  1. Acceptance of Terms
  2. Use License
  3. User Data and Privacy
  4. User Responsibilities
  5. Content Ownership
  6. Prohibited Activities
  7. Limitation of Liability
  8. Changes to Terms
  9. Termination
  10. Contact Information

### 3. Global Integration
**File**: `app/layout.tsx`

Added the `TOSAcceptanceModal` component to the root layout so it:
- Appears globally across the entire application
- Checks TOS acceptance status on every page load
- Shows the modal immediately if acceptance is required

### 4. Removed TOS from North Star Creation
**File**: `components/journey/CreateNorthStarDialog.tsx`

Removed the TOS checkbox from the North Star creation dialog since:
- TOS acceptance should only be required once at the profile/account level
- It was creating confusion by appearing in multiple places
- The global modal handles this more appropriately

## How It Works

1. **On Page Load**: The `TOSAcceptanceModal` component checks the current user's profile
2. **Version Check**: Compares the user's `tos_version` with `CURRENT_TOS_VERSION`
3. **Show Modal**: If not accepted or version is outdated, displays the modal
4. **User Action**: User must read and check the acceptance checkbox
5. **Save**: On acceptance, updates the profile with current timestamp and version
6. **Continue**: Modal closes and user can continue using the platform

## Updating TOS Version

To release a new version of the TOS:

1. Update the `CURRENT_TOS_VERSION` constant in `components/TOSAcceptanceModal.tsx`
2. Update the TOS content in the same file if needed
3. All users will be prompted to accept the new version on their next visit

## Database Schema

```sql
-- New columns in profiles table
tos_accepted_at TIMESTAMP WITH TIME ZONE
tos_version TEXT

-- Index for efficient queries
CREATE INDEX profiles_tos_accepted_at_idx 
ON profiles (tos_accepted_at) 
WHERE tos_accepted_at IS NULL;
```

## Testing

To test the TOS modal:

1. **New User**: Create a new account - modal should appear immediately
2. **Existing User**: Set `tos_accepted_at` to NULL in the database - modal should appear
3. **Version Update**: Change `CURRENT_TOS_VERSION` - all users should see the modal again
4. **Acceptance**: Accept the TOS - modal should not appear again until version changes

## Future Enhancements

Potential improvements:
- Add a "View TOS" link in user settings for reference
- Track TOS acceptance history (audit trail)
- Support for multiple languages
- Email notification when TOS is updated
- Admin dashboard to see TOS acceptance rates
