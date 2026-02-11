---
name: generate-pathlab-map
description: Generate strict PathLabMapStructure JSON for solo, self-paced, day-based PathLab explorations that end with a Continue/Pause/Quit decision. Use when a user asks to create PathLab map JSON, map drafts, or curriculum maps that must follow exact schema fields, day sequencing, node/edge integrity, and JSON-only output constraints.
---

# Generate PathLab Map

Generate a single valid JSON object that matches `PathLabMapStructure` exactly.

## Workflow

1. Extract required inputs from the user prompt.
2. Build a mostly linear day-based map with 5, 6, or 7 days.
3. Ensure each node starts with an action, includes low-effort signal checks, and captures proof of action where possible.
4. Validate key consistency across `nodes`, `edges`, and `path.days[].node_keys`.
5. Output only parseable JSON with no markdown or commentary.

## Output Contract

- Output one JSON object only.
- Include top-level keys: `seed`, `nodes`, `path`; include `edges` when used.
- Do not add extra top-level keys.
- Do not invent fields not present in the structure.
- Keep all required fields non-empty.
- Allow `content_url` only inside `content` items.

## Structure Rules

Use this exact object structure:

- `seed`: `{ "title", "description", "slogan" }`
- `nodes`: object keyed by node key; each value includes:
  - `title`
  - `instructions`
  - `node_type`: `"learning" | "text" | "comment" | "end"`
  - `position`: `{ "x": number, "y": number }`
  - `content`: array of at least 1 item with:
    - `content_type`: `"text" | "video" | "canva_slide" | "image" | "pdf" | "resource_link"`
    - `content_body`: non-empty string
    - `content_url`: optional
  - `assessments`: array of at least 1 item with:
    - `type`: `"quiz" | "text_answer" | "file_upload" | "image_upload" | "checklist"`
    - `prompt`: non-empty string
    - `isGraded`: boolean
    - `pointsPossible`: number
- `edges` (optional): array of `{ "source_key", "destination_key" }`
- `path`:
  - `total_days`: exactly `5`, `6`, or `7`
  - `days`: array length equals `total_days`
  - each day:
    - `day_number`: sequential from `1`
    - `title`
    - `context_text`
    - `reflection_prompts`: 1-2 short one-sentence prompts
    - `node_keys`: 1-2 keys; all keys must exist in `nodes`

## Pedagogy Rules

- Every node begins with an action task.
- Every node includes at least one low-effort signal: `quiz` or `checklist`.
- Prefer `file_upload` or `image_upload` to capture proof of action.
- Allow at most one `text_answer` per node, one sentence max.
- Keep node workload in the 15-45 minute range.
- Avoid front-loading explanation; favor immediate action.

## Graph And Position Rules

- Keep flow mostly linear.
- Start near `{ "x": 100, "y": 100 }`.
- Increase `x` by about `200-250` per sequential node.
- Keep `y` consistent for linear flow; vary only for optional branches.
- Ensure all edge references exist in `nodes`.

## Final Day Rule

- Include synthesis and exact prompt text:
  - `Based on this week, what's your next step? Continue / Pause / Quit`
- Use `node_type: "end"` for final-day decision node when appropriate.

## Silent Validation Before Output

- JSON parses cleanly.
- Day count equals `path.total_days`.
- Day sequence is valid and starts from `1`.
- Reflection prompt count/day is `1` or `2`.
- Every `node_key` reference exists.
- Final-day decision prompt exists exactly as required.

## References

- For the exact interface shape used in this repo, see:
  - `references/pathlab-map-structure.md`
