# Team Maps (Forking) — TODO / Implementation Plan

Status: draft

Goal

- Allow classroom maps to be forked to teams.
- Team members can edit their team's forked map in the normal map editor.
- The original map creator (or classroom owner) can continue to update the original map.
- Team maps can "pull" changes from the original map so teams can incorporate upstream updates.
- Instructors can view every team's map (read-only by default) and optionally take ownership.

Key contracts / primitives

- Map: existing `maps` table and related tables (nodes, paths, content, assessments).
- Team fork record: new `team_maps` table linking `team_id` -> `map_id` with pointer to `original_map_id`.
- Map versioning: add lightweight versioning metadata to `maps` and `map_nodes` for pull/merge logic.

Checklist (top-level)

- [ ] Create `team_maps` migration and indexes
- [ ] Add `version`, `updated_at`, `last_modified_by` to `maps` and `map_nodes`
- [ ] Implement `forkMapForTeam(originalMapId, teamId, createdBy)` helper in `lib/supabase/maps.ts`
- [ ] Implement `pullUpdatesForTeamMap(teamMapId)` helper (server-side merge logic)
- [ ] Add server endpoints (fork, list team maps, instructor list) with authorization
- [ ] Add UI: ClassroomMapsManager fork control, TeamDetailsManager list + editor link, Instructor view
- [ ] Add RLS policies and server-authorized actions (favor server APIs for writes)
- [ ] Add tests: unit, integration, and simple e2e
- [ ] Docs and UX polish (labels, badges, conflict UI)

Schema / Migration suggestions

1. Add `team_maps` linking table

```sql
-- supabase/migrations/xxxx_create_team_maps_table.sql
CREATE TABLE IF NOT EXISTS team_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  map_id uuid NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  original_map_id uuid NULL REFERENCES maps(id),
  created_by uuid NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  visibility text DEFAULT 'team',
  metadata jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX ON team_maps (team_id);
CREATE INDEX ON team_maps (map_id);
```

2. Lightweight versioning additions (for pull/merge)

```sql
-- maps table
ALTER TABLE maps
  ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_modified_by uuid NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- map_nodes table (or equivalent)
ALTER TABLE map_nodes
  ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_modified_by uuid NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
```

Design notes: version numbers are incremented on map-save for any change. `updated_at` and `last_modified_by` allow simple conflict detection.

API Contracts (server endpoints)

1. Fork a classroom map to a team

- POST /api/classrooms/:classroomId/maps/:mapId/fork-to-team
- Body: { team_id: string }
- Auth: caller must be classroom member and member of `team_id` (or be allowed by policy)
- Behavior:
  - If team already has a fork for original_map_id + team_id, return the existing `team_maps` row + map id.
  - Use `forkMapForTeam()` to deep-copy the map and its related rows (nodes, paths, content, assessments). Keep a mapping of oldNodeId -> newNodeId when copying paths.
  - Insert into `team_maps` with `original_map_id = mapId` and `map_id = newMapId`.
  - Return 201 with { team_map, map }

2. List team maps for a team

- GET /api/classrooms/:classroomId/teams/:teamId/maps
- Auth: caller must be a classroom instructor OR member of team
- Return: [{ team_map, map }]

3. Instructor: list all team maps for classroom

- GET /api/classrooms/:classroomId/team-maps
- Auth: classroom instructor only
- Return: [{ team_map, map, team_info, created_by }]

4. Pull updates from original map (team requests upstream changes)

- POST /api/maps/:teamMapId/pull-from-original
- Body: { strategy?: 'full-overwrite' | 'merge' } (default: 'merge')
- Auth: team member of the team owning `teamMapId` OR instructor (instructor-only mode can be read-only)
- Behavior (MVP 'merge'):
  - Compare `maps.version` and `map_nodes.version` between original and team map.
  - For nodes where team's `last_modified_at` <= fork time (or <= last_pulled_at), copy updates from original.
  - If conflict (team edited node after fork/pull), skip and record conflict in response.
  - Update `team_map.metadata.last_pulled_at` and bump map and node versions accordingly.
  - Return { pulled: count, conflicts: [{ nodeId, reason }], new_map_version }

Implementation details: Pull algorithm

- Minimum viable pull (safe): copy nodes/paths/content from original to team map only for nodes not edited by the team since fork (use `last_modified_by` + `updated_at` vs `team_maps.metadata.forked_at` or `last_pulled_at`).
- Merge mode (future): attempt 3-way merge by comparing original@fork, original@now, and team@now; requires snapshot data or recording the forked snapshot versions.

Data model additions for pull/merge

- `team_maps.metadata` store: { forked_at, forked_versions: { map_version, node_versions: { nodeId: version } }, last_pulled_at }
- On fork, save a snapshot of original version numbers to `team_maps.metadata.forked_versions` to simplify later diffs.

Permissions & RLS guidance

- Writes

  - Prefer server endpoints for fork and pull operations (they perform complex multi-row writes and permission checks).
  - For direct client-side map editing, RLS policy on `maps` and `map_nodes` should allow updates when:
    - map.id IN (SELECT map_id FROM team_maps WHERE team_id IN (SELECT team_id FROM team_memberships WHERE user_id = auth.uid AND left_at IS NULL))
    - OR user is map.created_by OR classroom instructor (if you want instructor edits)
  - If RLS complexity is high, require map editor save requests to go through server API which uses a service role to write.

- Reads
  - Anyone who can view the classroom or is a team member can read the original classroom maps.
  - Team map reads allowed to team members and instructors; other students should not see team-specific forks unless permission is granted.

UI changes (concrete components to update)

- `components/classroom/ClassroomMapsManager.tsx`

  - Add "Fork to team" control (dropdown of teams user belongs to + Fork button)
  - If user already has team fork, show "Open team map" button
  - On fork success, navigate to editor `/map/:newMapId/edit`

- `components/classroom/ClassroomTeamsManager.tsx` / `TeamDetailsModal.tsx`

  - Show list of team maps and "Open" links to `/map/:mapId/edit` for each
  - Show "Pull updates" button in team map list (if team member) to trigger pull endpoint and display conflicts if any

- `components/map/MapEditor.tsx`
  - When loading, detect if map is a team map (via `team_maps` lookup or metadata) and show an infobar: "Team map — editable by team: <team name>" with a link to original map and a pull button (if caller is team member)
  - Save behavior: normal save route but ensure that server-side authorizes the save (map owner or team member)

UX decisions to confirm (pick 1–2 now)

- Who can fork? (A) any team member, or (B) only team leaders. Recommendation: allow any team member to fork, but make fork action auditable and reversible.
- Duplicate forks: prevent duplicates (return existing fork) — recommended.
- Pull semantics: MVP -> copy-only nodes not modified by team since fork (safe, non-destructive). Later -> merge UI.

Edge cases

- Large maps: deep-copy might be slow — consider background job and return 202 with a progress status for very large maps.
- Deleted teams: decide whether to keep forks (orphaned) or delete them; recommend keep forks but mark as orphaned and allow instructor takeover.
- Conflicts: show a UI listing conflicting nodes with options to accept team version, accept upstream, or edit manually.

Tests

- Unit tests: `forkMapForTeam` behavior, `pullUpdatesForTeamMap` logic
- Integration: API endpoints with mock users and teams verifying permissions
- E2E: fork -> edit a node in team map -> instructor view sees the map -> pull upstream after original changes

Quick developer TODO (step-by-step)

1. Create migration for `team_maps` and version columns. Commit migration.
2. Add types in `types/map.ts` for `TeamMap` and update map types to include `version` metadata.
3. Implement `lib/supabase/maps.ts` helpers:
   - `forkMapForTeam(originalMapId, teamId, createdBy)`
   - `pullUpdatesForTeamMap(teamMapId, userId, options)`
4. Add server endpoints:
   - POST `/api/classrooms/:classroomId/maps/:mapId/fork-to-team`
   - GET `/api/classrooms/:classroomId/teams/:teamId/maps`
   - POST `/api/maps/:teamMapId/pull-from-original`
5. Update `components/classroom/ClassroomMapsManager.tsx` and `TeamDetailsModal.tsx` to surface fork/pull actions.
6. Add RLS policies for `maps`/`map_nodes` to allow team editing or route edits through server.
7. Add tests and QA.

Time estimates (rough)

- Migration & types: 1–2 hours
- Helpers & server endpoints: 3–6 hours
- UI changes: 2–4 hours
- RLS + testing: 2–4 hours
- Conflict UI and polish: 3+ hours depending on UX

Notes about "map creator can update maps" and "students can pull changes"

- Map creator updates:

  - The original map record remains the canonical classroom map and its `created_by` user (map creator) retains permission to update it.
  - Instructors/classroom owners should also be able to update classroom maps.
  - Updates to original map increment `maps.version` and `map_nodes.version`.

- Students pull changes into their team map:
  - A team map holds `original_map_id` and metadata `forked_versions` recorded at fork time.
  - When original map is updated, a team member can click "Pull updates". The server-side `pullUpdatesForTeamMap` will copy non-conflicting changes.
  - Conflicts are reported back so team can resolve.

Follow-up suggestions

- After MVP, add visual diffs for pull changes, automatic merge suggestions, and optional scheduled syncs.
- Consider adding an activity feed showing when forks were created and when pulls happened.

Next immediate step (recommendation)

- I can scaffold the migration SQL and the `forkMapForTeam` helper next. Which do you prefer me to create now: (A) migration SQL file, or (B) helper + API skeleton? Reply with A or B.
