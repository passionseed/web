# Map Editing Contract (Supabase MCP)

Use this reference when editing `map_nodes`, `node_content`, or `node_assessments`.

## Table contracts

### `learning_maps`
- `id` `uuid` primary key
- `metadata` is JSONB and contains `path` with `days` for legacy day-based maps

### `map_nodes`
- `id` `uuid` PK, `map_id` FK
- editable fields for content work: `title`, `instructions`, `difficulty`, `metadata`, `node_type`, `updated_at`

### `node_content`
- fields: `id`, `node_id`, `content_type`, `content_url`, `content_body`, `content_title`, `display_order`
- allowed `content_type` values:
  - `video`
  - `canva_slide`
  - `text`
  - `image`
  - `pdf`
  - `resource_link`
  - `order_code`
- `display_order` is integer and controls rendering order

### `node_assessments`
- fields: `id`, `node_id`, `assessment_type`, `metadata`, `points_possible`, `is_graded`,
  `is_group_assessment`, `group_formation_method`, `target_group_size`, `allow_uneven_groups`,
  `groups_config`, `group_submission_mode`
- allowed `assessment_type` values:
  - `quiz`
  - `text_answer`
  - `image_upload`
  - `file_upload`
  - `checklist`
- allowed `group_formation_method`: `manual`, `shuffle`
- allowed `group_submission_mode`: `all_members`, `single_submission`
- checklist payload is typically `metadata: {"items": ["...", "..."]}`

### `quiz_questions`
- fields: `id`, `assessment_id`, `question_text`, `options`, `correct_option`

## Useful discovery queries

1) Map and all related rows

```sql
SELECT
  lm.id AS map_id,
  lm.title AS map_title,
  mn.id AS node_id,
  mn.title AS node_title,
  nc.id AS content_id,
  nc.content_type,
  na.id AS assessment_id,
  na.assessment_type,
  qq.id AS question_id,
  qq.question_text
FROM learning_maps lm
LEFT JOIN map_nodes mn ON mn.map_id = lm.id
LEFT JOIN node_content nc ON nc.node_id = mn.id
LEFT JOIN node_assessments na ON na.node_id = mn.id
LEFT JOIN quiz_questions qq ON qq.assessment_id = na.id
WHERE lm.id = :learning_map_id
ORDER BY mn.created_at, nc.display_order, na.assessment_type;
```

2) Resolve by seed

```sql
SELECT id AS seed_id, title, map_id
FROM seeds
WHERE id = :seed_id;
```

3) Node inventory for one map

```sql
SELECT id, title, instructions, metadata
FROM map_nodes
WHERE map_id = :learning_map_id
ORDER BY created_at;
```

## Common update patterns

- Replace map copy without changing IDs:
  - `UPDATE learning_maps ...`
- Rewrite one node:
  - `UPDATE map_nodes ...`
- Rewrite one content block:
  - `UPDATE node_content ...`
- Replace all content items of one type:
  - `DELETE FROM node_content WHERE node_id = :node_id AND content_type = :content_type`
  - then `INSERT` new rows
- Rewrite one assessment:
  - `UPDATE node_assessments ...`
- Rewrite checklist items:
  - `UPDATE node_assessments SET metadata = jsonb_build_object('items', :json_array)::jsonb ...`
- Rewrite quiz questions:
  - `DELETE FROM quiz_questions WHERE assessment_id = :assessment_id`
  - then `INSERT` new questions

## Verification snippets

```sql
-- changed node snapshot
SELECT id, title, instructions, metadata
FROM map_nodes
WHERE id = :node_id;

-- changed content snapshot
SELECT id, content_type, content_title, content_body, content_url, display_order
FROM node_content
WHERE node_id = :node_id
ORDER BY display_order, id;

-- changed assessments snapshot
SELECT id, assessment_type, points_possible, is_graded, is_group_assessment, metadata
FROM node_assessments
WHERE node_id = :node_id;

-- changed quiz snapshot
SELECT id, question_text, options, correct_option
FROM quiz_questions
WHERE assessment_id = :assessment_id
ORDER BY id;
```
