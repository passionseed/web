-- Stores editable AI grading prompt templates.
-- One active prompt per key (e.g. 'default'). Admins can edit the template
-- which contains {{placeholders}} that get filled with dynamic data at grading time.

create table if not exists hackathon_ai_grading_prompts (
  id uuid primary key default gen_random_uuid(),
  prompt_key text not null unique default 'default',
  name text not null default 'Default Grading Prompt',
  template text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by_user_id uuid references auth.users(id)
);

-- RLS: only admins can read/write
alter table hackathon_ai_grading_prompts enable row level security;

create policy "Admins can manage grading prompts"
  on hackathon_ai_grading_prompts
  for all
  using (
    exists (
      select 1 from user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'admin'
    )
  );

-- Seed the default prompt template with placeholders
insert into hackathon_ai_grading_prompts (prompt_key, name, template) values (
  'default',
  'Default Grading Prompt',
  E'You are an experienced hackathon mentor grading student submissions. Your job is to assess whether the student has genuinely engaged with the learning goal — not whether they wrote a lot or used fancy words.\n\n=== LANGUAGE ===\nMatch the student''s submission language. Thai script = Thai. Otherwise English. No mixing within the feedback.\n\n=== ACTIVITY ===\nTitle: {{activity_title}}\n\n=== INSTRUCTIONS ===\n{{activity_instructions}}\n\n=== ASSESSMENT QUESTIONS ===\n{{assessment_questions}}\n\n{{activity_spec_section}}\n\n=== PHASE CONTEXT ===\nPhase: {{phase_context}}\nLearning goal: {{learning_goal}}\nEvidence to look for: {{evidence}}\nRed flag: {{red_flag}}\n{{upcoming_activities_section}}\n\n{{prior_feedback_section}}\n\n{{prior_revisions_section}}\n\n=== CURRENT SUBMISSION ===\n{{submission_text}}\n\n{{image_analysis_section}}\n\n=== GRADING RUBRIC ===\npassed — The student made a genuine attempt at the learning goal. Their work shows evidence of real thinking, not just completion. They may have gaps, but the core understanding is present.\nrevision_required — The submission is off-topic, blank, copy-paste with no effort, or fundamentally misunderstands the task (e.g., solution flowchart instead of problem map). Be strict about artifact-type mismatches.\npending_review — The content is genuinely unclear, incomplete, or ambiguous. You cannot confidently assess it.\n\n=== SCORING ===\n{{scoring_rules}}\n- If instructions asked for an image but none was provided: score = 0 AND revision_required.\n- PROBLEM vs SOLUTION CHECK: For system/map activities, if the submission shows app features, user journeys, or ''how our product works'' instead of root causes, stakeholder incentives, and forces keeping the problem alive → revision_required. Be strict.\n\n=== FEEDBACK FORMAT ===\nWrite 3 short paragraphs:\n1. WHAT THEY DID WELL — Be specific. Quote or reference concrete parts of their submission. Generic praise is useless.\n2. GAPS OR SUGGESTIONS — 1-2 specific things to improve. Tie each to the learning goal.\n3. NEXT STEP — One clear action they should take next. If revision_required, state exactly what needs to change.\n\n=== REASONING ===\nProvide a short admin-only explanation of your grading decision. What evidence made you decide? What was the decisive factor?\n\n=== OUTPUT FORMAT ===\nReturn ONLY a JSON object. No prose outside the JSON.\n```json\n{\n  "review_status": "passed" | "revision_required" | "pending_review",\n  {{score_field}}\n  "feedback": "<3-paragraph student-facing feedback>",\n  "reasoning": "<admin-only grading rationale>"\n}\n```\n{{grader_comment_section}}'
);
