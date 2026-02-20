---
name: supabase-mcp-map-editor
description: Edit and improve learning map content in Supabase through natural-language prompts, including deep updates to learning_maps metadata, map_nodes, node_content, node_assessments, and quiz_questions. Use when user asks to revise map copy, replace node instructions, adjust assessments, or edit checklist/quiz structures in MCP.
---

# Supabase MCP Map Editor

Use this whenever a user wants to edit map content in Supabase by prompt. Target these tables: `learning_maps`, `map_nodes`, `node_content`, `node_assessments`, and `quiz_questions`.

## 1) Resolve the exact target

1. Ask for one of:
- `learning_map_id`, or
- `seed_id` (then resolve `seeds.map_id`), or
- an exact, unique map title.

2. Ask if the user wants a top-level edit, node-level edit, node_content edit, or assessment edit.

3. Resolve node identity before editing:
- Prefer `node_id`.
- If omitted, use title match inside the chosen map and confirm ambiguity.
- If user says day number, map to the day’s node through `learning_maps.metadata.path.days` and/or `map_nodes.title`.

## 2) Read current state first (required)

Run a read query and show a compact summary before writes.

```sql
SELECT
  mn.id AS node_id,
  mn.title,
  mn.instructions,
  mn.metadata,
  nc.id AS content_id,
  nc.content_type,
  nc.content_title,
  nc.content_body,
  nc.content_url,
  nc.display_order,
  na.id AS assessment_id,
  na.assessment_type,
  na.points_possible,
  na.is_graded,
  na.is_group_assessment,
  na.group_formation_method,
  na.target_group_size,
  na.allow_uneven_groups,
  na.metadata AS assessment_metadata
FROM map_nodes mn
LEFT JOIN node_content nc ON nc.node_id = mn.id
LEFT JOIN node_assessments na ON na.node_id = mn.id
WHERE mn.map_id = :learning_map_id
ORDER BY mn.created_at, nc.display_order NULLS LAST;
```

If user provided `seed_id`, first get `map_id`:

```sql
SELECT map_id FROM seeds WHERE id = :seed_id;
```

If multiple maps match a title, ask to pick one by ID.

## 3) Apply edits using stable IDs

### Learning map edits

- Update title/description/slogan/metadata with targeted `UPDATE` queries.

```sql
UPDATE learning_maps
SET title = COALESCE(:title, title),
    description = COALESCE(:description, description),
    slogan = COALESCE(:slogan, slogan),
    difficulty = COALESCE(:difficulty, difficulty),
    metadata = COALESCE(:metadata_json::jsonb, metadata),
    updated_at = now()
WHERE id = :learning_map_id;
```

### map_nodes edits

```sql
UPDATE map_nodes
SET title = COALESCE(:title, title),
    instructions = COALESCE(:instructions, instructions),
    metadata = COALESCE(:metadata_json::jsonb, metadata),
    difficulty = COALESCE(:difficulty, difficulty),
    node_type = COALESCE(:node_type, node_type),
    updated_at = now()
WHERE id = :node_id
  AND map_id = :learning_map_id;
```

### node_content edits (deeper level)

1) Replace specific content item by `content_id`.

```sql
UPDATE node_content
SET content_body = COALESCE(:content_body, content_body),
    content_title = COALESCE(:content_title, content_title),
    content_url = :content_url,
    content_type = COALESCE(:content_type, content_type),
    display_order = COALESCE(:display_order, display_order)
WHERE id = :content_id
  AND node_id = :node_id;
```

2) Replace all content of one type for a node (safe for full rewrite).

```sql
BEGIN;
DELETE FROM node_content
WHERE node_id = :node_id
  AND content_type = :content_type;
INSERT INTO node_content (node_id, content_type, content_title, content_body, content_url, display_order)
VALUES
  (:node_id, :content_type, :content_title, :content_body, :content_url, :display_order);
COMMIT;
```

### node_assessments edits (deeper level)

1) Update existing assessment by `assessment_id` (preferred).

```sql
UPDATE node_assessments
SET assessment_type = COALESCE(:assessment_type, assessment_type),
    points_possible = :points_possible,
    is_graded = COALESCE(:is_graded, is_graded),
    is_group_assessment = COALESCE(:is_group_assessment, is_group_assessment),
    group_formation_method = COALESCE(:group_formation_method, group_formation_method),
    target_group_size = COALESCE(:target_group_size, target_group_size),
    allow_uneven_groups = COALESCE(:allow_uneven_groups, allow_uneven_groups),
    group_submission_mode = COALESCE(:group_submission_mode, group_submission_mode),
    groups_config = COALESCE(:groups_config_json::jsonb, groups_config),
    metadata = COALESCE(:metadata_json::jsonb, metadata)
WHERE id = :assessment_id
  AND node_id = :node_id;
```

2) Checklist updates.

```sql
UPDATE node_assessments
SET metadata = jsonb_build_object('items', :items::jsonb)
WHERE id = :assessment_id
  AND node_id = :node_id;
```

3) Remove and rebuild quiz questions when prompt requests quiz rewrite.

```sql
BEGIN;
DELETE FROM quiz_questions
WHERE assessment_id = :assessment_id;
INSERT INTO quiz_questions (assessment_id, question_text, options, correct_option)
VALUES (:assessment_id, :question_text, :options_json::jsonb, :correct_option)
    -- repeat for each question
;
COMMIT;
```

## 4) Validation and safety

- Never run node-wide `UPDATE`/`DELETE` without a `node_id`.
- Never run `UPDATE`/`DELETE` using only `map_id` for child tables unless user explicitly asked to replace all content/assessments for the entire map.
- When a user says “improve wording,” keep IDs stable and avoid deleting IDs unless explicitly requested.
- If multiple `node_assessments` or `node_content` exist for one node, list all IDs and ask which one to edit before mutating.

## 5) Output contract

Return exactly:
1. a compact plan (what will change),
2. the SQL statements in one ordered block,
3. a quick verification query.

Use `references/map-edit-contract.md` for enum constraints and schema defaults before applying.
