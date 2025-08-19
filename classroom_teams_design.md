# Classroom Teams System Design

## classroom_teams table
- id (uuid, primary key)
- classroom_id (uuid, foreign key to classrooms)
- name (text, required)
- description (text, optional)
- created_by (uuid, foreign key to auth.users)
- created_at (timestamp, default now)
- is_active (boolean, default true)
- max_members (integer, optional)
- team_metadata (jsonb, optional)

## team_memberships table
- id (uuid, primary key)
- team_id (uuid, foreign key to classroom_teams)
- user_id (uuid, foreign key to auth.users)
- role (text, default 'member')
- joined_at (timestamp, default now)
- left_at (timestamp, nullable)
- is_leader (boolean, default false)
- member_metadata (jsonb, optional)

## Constraints
- Unique constraint on (team_id, user_id) for active memberships
- Check constraint on role values
- Check constraint on max_members (> 0)