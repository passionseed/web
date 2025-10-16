# Map Edit Security Implementation

## Overview
This document details the security measures implemented for the map editing functionality to ensure only authorized users (admins and instructors) can edit learning maps.

## Security Layers

### 1. Server-Side Page Protection
**File:** `app/map/[id]/edit/page.tsx`

**Checks Performed:**
1. **Input Validation**: Validates mapId format to prevent injection attacks
2. **Authentication**: Verifies user is logged in
3. **Role Authorization**: Checks user has "admin" or "instructor" role in `user_roles` table
4. **Map Existence**: Verifies the map exists in the database
5. **Ownership Verification**:
   - Admins can edit ANY map
   - Instructors can ONLY edit maps they created (creator_id match)

**Redirects:**
- Not authenticated → `/login`
- No admin/instructor role → `/map/{id}` (map viewer)
- Map not found → `/map` (map list)
- Not owner and not admin → `/map/{id}` (map viewer)

### 2. API Route Protection
**File:** `app/api/maps/[id]/route.ts`

**Checks Performed (PUT endpoint):**
1. **Authentication**: Verifies user is logged in (401 if not)
2. **Role Authorization**: Checks user has "admin" or "instructor" role (403 if not)
3. **Map Existence**: Verifies the map exists (404 if not)
4. **Ownership Verification**:
   - Admins can edit ANY map
   - Instructors can ONLY edit maps they created
   - Returns 403 if instructor tries to edit someone else's map

**HTTP Status Codes:**
- `400`: Bad Request (missing mapId or ID mismatch)
- `401`: Unauthorized (not logged in)
- `403`: Forbidden (insufficient permissions or not owner)
- `404`: Not Found (map doesn't exist)
- `500`: Server Error

### 3. Database-Level Security (RLS)
**Recommendation:** Ensure Row Level Security (RLS) policies are in place:

```sql
-- Example RLS policy for learning_maps
CREATE POLICY "Instructors can update their own maps"
ON learning_maps FOR UPDATE
USING (
  auth.uid() = creator_id OR
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);
```

## Permission Matrix

| User Role | Can View Edit Page | Can Edit Own Maps | Can Edit Other Maps | Notes |
|-----------|-------------------|-------------------|---------------------|-------|
| Student | ❌ | ❌ | ❌ | Redirected to map viewer |
| Instructor | ✅ | ✅ | ❌ | Only their created maps |
| Admin | ✅ | ✅ | ✅ | Full access to all maps |
| Not Logged In | ❌ | ❌ | ❌ | Redirected to login |

## Security Features

### ✅ Implemented
1. **Multi-layer defense**: Page + API + (recommended) Database RLS
2. **Proper HTTP status codes**: Clear error messages
3. **Input validation**: Prevents injection attacks
4. **Ownership tracking**: Creator ID verification
5. **Role-based access control**: Admin vs Instructor permissions
6. **Audit logging**: Console logs for access attempts

### 🔒 Security Best Practices
1. **Server-side validation**: All checks happen on server, never trust client
2. **Fail securely**: Deny access by default, redirect to safe pages
3. **Audit trail**: Logs suspicious access attempts
4. **Principle of least privilege**: Instructors limited to their own maps
5. **Defense in depth**: Multiple security layers

## Testing Checklist

- [ ] **Student user** cannot access `/map/{id}/edit` (redirects to viewer)
- [ ] **Not logged in** redirects to `/login`
- [ ] **Instructor** can edit their own maps
- [ ] **Instructor** cannot edit other instructor's maps (redirects to viewer)
- [ ] **Admin** can edit any map
- [ ] **API calls** without auth return 401
- [ ] **API calls** without proper role return 403
- [ ] **API calls** to non-existent maps return 404
- [ ] **Direct file access** to `edit-page-client.tsx` is blocked by wrapper

## Potential Vulnerabilities (Now Mitigated)

### ❌ BEFORE (Vulnerabilities)
1. ~~No API authentication - anyone could update maps~~
2. ~~No role checking - students could edit if they knew the URL~~
3. ~~No ownership verification - instructors could edit any map~~
4. ~~Client component directly exposed~~

### ✅ AFTER (Secured)
1. ✅ Full authentication on both page and API
2. ✅ Role-based authorization enforced
3. ✅ Ownership verification with admin override
4. ✅ Server wrapper protects client component

## Monitoring & Alerts

**Recommended monitoring:**
- Log all failed access attempts to map edit pages
- Alert on repeated 403/401 errors from same user
- Track which instructors are editing which maps
- Monitor for unusual patterns (e.g., editing many maps quickly)

## Future Enhancements

1. **Rate limiting**: Prevent brute force attempts
2. **CSRF protection**: Add CSRF tokens to API calls
3. **Audit log table**: Store edit history in database
4. **Permission inheritance**: Support for classroom-based permissions
5. **Temporary access grants**: Allow admins to grant temporary edit access

## Documentation Links

- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
