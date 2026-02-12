---
name: generate-pathlab-map
description: Generate strict PathLabMapStructure JSON for solo, self-paced, day-based PathLab explorations that end with a Continue/Pause/Quit decision. Use when a user asks to create PathLab map JSON, map drafts, or curriculum maps that must follow exact schema fields, day sequencing, node/edge integrity, and JSON-only output constraints.
---

# Generate PathLab Map

Generate a single valid JSON object that matches `PathLabMapStructure` exactly.

## Workflow

1. Extract required inputs from the user prompt.
2. Run a discovery pass to find real external resources and real-world signals for the topic.
3. Build a mostly linear day-based map with 5, 6, or 7 days.
4. Ensure each node starts with an action, includes low-effort signal checks, and captures proof of action.
5. Validate schema integrity plus all strict ratio/quality rules before output.
6. Output only parseable JSON with no markdown or commentary.

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

## Resource Discovery Rules (Strict)

- Before generating nodes, discover real external resources and use only verified public URLs.
- At least 50% of nodes must include at least one `content` item with `content_type: "video"` (round up).
- Every `video` item must include a real, publicly accessible URL in `content_body`.
- Every `resource_link` item must include a real, publicly accessible URL in `content_body`.
- Do not invent URLs.
- Prefer high-quality sources in this order:
  - Educational YouTube creators
  - Official documentation
  - Credible industry blogs
  - University resources
- Avoid low-quality blog spam and SEO filler sites.
- For every `video` or `resource_link`, `content_body` must include exactly:
  - `Title: ...`
  - `URL: https://...`
  - `Why: ...` (one sentence on usefulness)
- Keep `content_url` optional; if present, it must match the URL in `content_body`.

## Evidence Design Rules (Strict)

- At least 60% of nodes must include either `file_upload` or `image_upload` in `assessments` (round up).
- Upload prompts must clearly specify what proof is required.
- Vague prompts such as "Upload your work" are not allowed.
- Every upload prompt must specify required format (`PNG`, `PDF`, `link`, etc.).
- Prefer evidence prompts tied to concrete outputs (prototype screenshot, brief PDF, repo link file).

## Signal Capture Rules

- Every node must include at least one low-effort signal:
  - one binary `checklist`, or
  - one short `quiz` with a maximum of 3 questions.
- Checklist items must measure behavior and effort, not feelings.
- Bad signal example: "Did you enjoy it?"
- Good signal examples:
  - "I spent at least 20 focused minutes"
  - "I completed the prototype"
  - "I watched the full video"

## Action-First Rule

- `instructions` must start with a verb and require an action in the first sentence.
- Reference resources only after the first action sentence.
- Forbidden pattern: "Read this article about..."
- Required pattern: "Build a basic API request using Postman. If stuck, watch the video below."

## Real-World Exposure Rule

- At least one node must require real-world exposure through at least one of:
  - searching real job listings
  - reviewing real portfolios
  - reviewing real university syllabi
  - analyzing real market data
  - contacting someone asynchronously (optional)
- That node must include upload evidence with explicit proof format (screenshot or link file).

## Discovery Mode (Advanced)

- Before generating nodes, identify internally:
  - 3 real tools used in the target career/path
  - 3 real job titles
  - 2 common beginner mistakes
- Use this analysis to shape node actions, resources, and assessments.
- Do not output this analysis directly; only reflect it in generated nodes.

## Graph And Position Rules

- Keep flow mostly linear.
- Start near `{ "x": 100, "y": 100 }`.
- Increase `x` by about `200-250` per sequential node.
- Keep `y` consistent for linear flow; vary only for optional branches.
- Ensure all edge references exist in `nodes`.

## Final Day Requirements (Strict)

- Final day must include:
  - one upload-based synthesis artifact that proves thinking (explicit required format)
  - one checklist item capturing energy level, for example: "I want to go deeper next week"
  - one explicit decision prompt with exact text:
    - `Based on this week, what's your next step? Continue / Pause / Quit`
  - one confidence score prompt from `0-10` (quiz or checklist-style signal)
- Use `node_type: "end"` for the final-day decision node.

## Silent Validation Before Output

- JSON parses cleanly.
- Day count equals `path.total_days`.
- Day sequence is valid and starts from `1`.
- Reflection prompt count/day is `1` or `2`.
- Every `node_key` reference exists.
- At least 50% of nodes include `video` content.
- At least 60% of nodes include `file_upload` or `image_upload`.
- Every `video`/`resource_link` has a real URL in `content_body` plus `Title/URL/Why` format.
- Every node includes at least one binary checklist or one short quiz (max 3 questions).
- At least one node includes required real-world exposure with proof upload.
- Final day includes synthesis upload, energy checklist, explicit Continue/Pause/Quit prompt, and confidence score.
- Final-day decision prompt exists exactly as required.

## References

- For the exact interface shape used in this repo, see:
  - `references/pathlab-map-structure.md`
