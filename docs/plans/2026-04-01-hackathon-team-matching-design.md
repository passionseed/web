# Hackathon Team Matching Design

## Goal

Enable unteamed hackathon participants to:

- add the people they actually met during a networking event,
- rank only that shortlist in the web app,
- automatically receive final 3-5 person teams when the event closes.

The system should prioritize mutual rankings above everything else and still place everyone by falling back to questionnaire compatibility when mutual signal is weak.

## Product Decisions

- Matching uses a dedicated event model instead of the existing waitlist flow.
- Participants can add met connections one-sided; mutual confirmation is not required.
- Participants can rank only people on their own met list.
- When the event closes, the system auto-creates final teams directly.
- The matching objective is mutual ranking strength first.
- If a participant has weak or no mutual matches, the system still auto-places them using secondary compatibility signals.

## Existing Context

The repository already has:

- hackathon-specific authentication via `hackathon_sessions` and the `hackathon_token` cookie,
- participant records in `hackathon_participants`,
- questionnaire context in `hackathon_pre_questionnaires`,
- manual team creation/join/leave in `hackathon_teams` and `hackathon_team_members`,
- a current waitlist-style matching flow on `/hackathon/team`,
- an admin-only preference simulator in `components/admin/team-matching`.

This means the new feature should layer event-based ranking on top of the current hackathon system and write final output into the existing team tables.

## User Flow

### Participant flow

1. Participant signs in with the existing hackathon auth.
2. Participant opens a matching page for the active event.
3. Participant browses unteamed participants and adds people they met to a personal shortlist.
4. Participant reorders that shortlist into ranked preferences.
5. Participant can revise the list until the event is locked.
6. When matching completes, the participant sees their final team through the existing hackathon team area.

### Admin flow

1. Admin creates or opens a matching event.
2. Admin starts the event so participant editing is allowed.
3. Admin closes the event, which locks rankings.
4. The system runs the auto-matcher and creates final teams.
5. Admin can inspect the produced teams through existing team admin surfaces.

## Data Model

### `hackathon_matching_events`

Represents one real-world networking and matching round.

Suggested fields:

- `id`
- `name`
- `status` with values such as `draft`, `live`, `ranking_locked`, `matched`
- `min_team_size`
- `max_team_size`
- `ranking_deadline`
- `matched_at`
- `created_at`
- `updated_at`

### `hackathon_matching_met_connections`

Stores one-sided "I met this person" edges.

Suggested fields:

- `event_id`
- `participant_id`
- `met_participant_id`
- `created_at`

Constraints:

- unique on `(event_id, participant_id, met_participant_id)`
- prevent self-links

### `hackathon_matching_rankings`

Stores ranked preferences over a participant's met list.

Suggested fields:

- `event_id`
- `participant_id`
- `ranked_participant_id`
- `rank_order`
- `created_at`

Constraints:

- unique on `(event_id, participant_id, ranked_participant_id)`
- unique on `(event_id, participant_id, rank_order)`
- ranking targets must come from that participant's met connections
- prevent self-ranking

### `hackathon_matching_runs`

Audit trail for deterministic debugging and reruns.

Suggested fields:

- `id`
- `event_id`
- `status`
- `input_snapshot`
- `result_snapshot`
- `error_message`
- `created_at`

## Matching Algorithm

### Objective

Maximize mutual ranking satisfaction while respecting team size limits of 3 to 5 and ensuring everyone is placed.

### Inputs

- participants who are not already in a team,
- met connections for the active event,
- ranking lists for the active event,
- questionnaire fields from `hackathon_pre_questionnaires`.

### Pair scoring

Each participant pair receives a weighted score.

Primary signals:

- strong score when both participants ranked each other,
- higher score when both ranked each other near the top,
- smaller score when only one side ranked the other.

Fallback signals:

- overlap in `problem_preferences`,
- role complement from `team_role_preference`,
- track similarity where useful,
- experience spread as a weak balancing signal.

### Team assembly

1. Build a weighted graph over eligible participants.
2. Seed candidate groups from the strongest mutual edges and small mutual structures.
3. Grow groups by adding the participant with the best marginal score increase.
4. Keep all teams within the configured 3-5 range.
5. Auto-place low-signal leftovers into the best remaining spots using fallback compatibility.
6. Run a final local improvement pass that swaps participants between teams when overall score improves.

### Guarantees

- no participant is left unassigned if a valid placement exists,
- final teams are 3-5 members whenever mathematically possible,
- mutual rankings dominate the outcome,
- questionnaire fit is fallback, not the primary objective.

## Integration Plan

### Backend

- add migrations for event, met-connection, ranking, and run-log tables,
- extend `lib/hackathon/db.ts` with matching-event queries and writes,
- add a pure matching engine in `lib/hackathon/team-matching.ts`,
- add APIs for participant shortlist and ranking management,
- add an admin API that closes an event and writes final `hackathon_teams` and `hackathon_team_members`.

### Frontend

- add a participant matching page under `/hackathon`,
- show active event state, met shortlist management, and ranking UI,
- update the existing team dashboard to route users into matching when they do not yet have a team but an event is live,
- expose minimal admin controls to run the event lifecycle.

## Error Handling

- reject edits if there is no live event,
- reject rankings for participants not on the user's met list,
- reject ranking writes for users already assigned to a team,
- reject duplicate or self-referential met/ranking records,
- record failed matching runs in `hackathon_matching_runs`.

## Testing Strategy

- pure unit tests for pair scoring and team assembly,
- route-level validation tests for met-list and ranking constraints,
- integration-style tests for end-to-end event closure and final team creation,
- regression tests around edge cases such as 6, 7, and 11 participant distributions.

## Open Assumptions

- only unteamed participants are eligible for event matching,
- one matching event is active at a time,
- auto-created final teams can use generated names and lobby codes from the existing team helpers,
- admin review is not required before publishing results.
