-- Migration: Create path_npc_conversations for Web Developer PathLab
-- Fixes: "No conversation_id in metadata" error on all 5 NPC activities
-- Seed: f989a28a-1c4f-42b6-929f-fe00bc77f533 (Web Developer: Ship Your First Project)

DO $$
DECLARE
  avatar_id UUID;
BEGIN
  -- Look up Alex's NPC avatar for this seed
  SELECT id INTO avatar_id
  FROM public.seed_npc_avatars
  WHERE seed_id = 'f989a28a-1c4f-42b6-929f-fe00bc77f533'
  LIMIT 1;

  IF avatar_id IS NULL THEN
    RAISE EXCEPTION 'NPC avatar not found for Web Developer seed. Run seed first.';
  END IF;

  -- ============================================================
  -- INSERT CONVERSATIONS (root_node_id = NULL, set after nodes)
  -- ============================================================

  INSERT INTO public.path_npc_conversations (id, seed_id, title, root_node_id, estimated_minutes)
  VALUES
    ('a1000001-0000-0000-0000-000000000001', 'f989a28a-1c4f-42b6-929f-fe00bc77f533', 'PM Alex Introduction', NULL, 2),
    ('a1000001-0000-0000-0000-000000000002', 'f989a28a-1c4f-42b6-929f-fe00bc77f533', 'Requirements Review with Alex', NULL, 3),
    ('a1000001-0000-0000-0000-000000000003', 'f989a28a-1c4f-42b6-929f-fe00bc77f533', 'Sprint Check-in with Alex', NULL, 2),
    ('a1000001-0000-0000-0000-000000000004', 'f989a28a-1c4f-42b6-929f-fe00bc77f533', 'Final Review with Alex', NULL, 5),
    ('a1000001-0000-0000-0000-000000000005', 'f989a28a-1c4f-42b6-929f-fe00bc77f533', 'Sprint Retrospective with Alex', NULL, 3)
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- DAY 1: PM Alex Introduction
  -- Tree: [statement] → "Got it!" → [end]
  -- ============================================================

  INSERT INTO public.path_npc_conversation_nodes (id, conversation_id, npc_avatar_id, node_type, text_content)
  VALUES
    ('b1000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000001', avatar_id, 'statement',
     'Hey! I''m Alex, your Product Manager for this project. Excited to have you on the team. Let me give you the quick context: We''re building something from scratch this week, and you''re going to ship it live by Day 4. No pressure, but also... this is how real developers work. Today''s mission: Get your tools set up, explore what''s possible, and create your first prototype using v0.dev. It''s going to generate UI for you — don''t worry about how it works yet. Just play. Ready to dive in?'),
    ('b1000001-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000001', avatar_id, 'end', '')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.path_npc_conversation_choices (id, from_node_id, to_node_id, choice_text, display_order)
  VALUES
    ('c1000001-0000-0000-0000-000000000001', 'b1000001-0000-0000-0000-000000000001', 'b1000001-0000-0000-0000-000000000002', 'Got it! Let''s go.', 1)
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.path_npc_conversations
  SET root_node_id = 'b1000001-0000-0000-0000-000000000001'
  WHERE id = 'a1000001-0000-0000-0000-000000000001'
    AND root_node_id IS NULL;

  -- ============================================================
  -- DAY 2: Requirements Review with Alex
  -- Tree: [statement] → "Got it!" → [end]
  -- ============================================================

  INSERT INTO public.path_npc_conversation_nodes (id, conversation_id, npc_avatar_id, node_type, text_content)
  VALUES
    ('b1000002-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000002', avatar_id, 'statement',
     'I saw your v0 prototype — nice start! Before we lock in the design, I have a few questions:' || E'\n\n' ||
     '1. Who is this for? Be specific — "everyone" is not an answer.' || E'\n' ||
     '2. What''s the ONE thing it needs to do really well?' || E'\n' ||
     '3. What would make you proud to ship this?' || E'\n\n' ||
     'Take a few minutes to think about these. Your answers will shape everything we build.'),
    ('b1000002-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000002', avatar_id, 'end', '')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.path_npc_conversation_choices (id, from_node_id, to_node_id, choice_text, display_order)
  VALUES
    ('c1000002-0000-0000-0000-000000000001', 'b1000002-0000-0000-0000-000000000001', 'b1000002-0000-0000-0000-000000000002', 'Got it, I''ll think on these.', 1)
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.path_npc_conversations
  SET root_node_id = 'b1000002-0000-0000-0000-000000000001'
  WHERE id = 'a1000001-0000-0000-0000-000000000002'
    AND root_node_id IS NULL;

  -- ============================================================
  -- DAY 3: Sprint Check-in with Alex
  -- Tree: [statement] → "Got it!" → [end]
  -- ============================================================

  INSERT INTO public.path_npc_conversation_nodes (id, conversation_id, npc_avatar_id, node_type, text_content)
  VALUES
    ('b1000003-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000003', avatar_id, 'statement',
     'How''s the sprint going?' || E'\n\n' ||
     'Quick check-in:' || E'\n' ||
     '- What''s working?' || E'\n' ||
     '- What''s blocking you?' || E'\n' ||
     '- Do you need to adjust the scope?' || E'\n\n' ||
     'Remember: A shipped simple project beats an unfinished complex one. If you''re stuck, let''s simplify.'),
    ('b1000003-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000003', avatar_id, 'end', '')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.path_npc_conversation_choices (id, from_node_id, to_node_id, choice_text, display_order)
  VALUES
    ('c1000003-0000-0000-0000-000000000001', 'b1000003-0000-0000-0000-000000000001', 'b1000003-0000-0000-0000-000000000002', 'Got it, thanks for the check-in.', 1)
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.path_npc_conversations
  SET root_node_id = 'b1000003-0000-0000-0000-000000000001'
  WHERE id = 'a1000001-0000-0000-0000-000000000003'
    AND root_node_id IS NULL;

  -- ============================================================
  -- DAY 4: Final Review with Alex (branching)
  -- Tree: [stmt1] → Continue → [stmt2] → Continue →
  --       [question: ready?]
  --         "I'm ready to ship!" → [stmt: Amazing!] → Done! → [end]
  --         "I'm blocked by..."  → [stmt: Normal.]  → Got it → [end]
  -- ============================================================

  INSERT INTO public.path_npc_conversation_nodes (id, conversation_id, npc_avatar_id, node_type, text_content)
  VALUES
    ('b1000004-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000004', avatar_id, 'statement',
     'Looking good! Let''s do a final review before we ship.'),
    ('b1000004-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000004', avatar_id, 'statement',
     'Tell me:' || E'\n' ||
     '1. What are you most proud of?' || E'\n' ||
     '2. What would you do differently if you had more time?' || E'\n' ||
     '3. Are you ready to ship?'),
    ('b1000004-0000-0000-0000-000000000003', 'a1000001-0000-0000-0000-000000000004', avatar_id, 'question',
     'If yes, let''s get this live. If not, what''s blocking you?'),
    ('b1000004-0000-0000-0000-000000000004', 'a1000001-0000-0000-0000-000000000004', avatar_id, 'statement',
     'Amazing! Let''s push it live. You shipped something real this week. That''s more than most people ever do.'),
    ('b1000004-0000-0000-0000-000000000005', 'a1000001-0000-0000-0000-000000000004', avatar_id, 'statement',
     'That''s totally normal. Let''s simplify scope and ship what you have. A working simple app beats an unfinished complex one every time.'),
    ('b1000004-0000-0000-0000-000000000006', 'a1000001-0000-0000-0000-000000000004', avatar_id, 'end', '')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.path_npc_conversation_choices (id, from_node_id, to_node_id, choice_text, display_order)
  VALUES
    ('c1000004-0000-0000-0000-000000000001', 'b1000004-0000-0000-0000-000000000001', 'b1000004-0000-0000-0000-000000000002', 'Continue', 1),
    ('c1000004-0000-0000-0000-000000000002', 'b1000004-0000-0000-0000-000000000002', 'b1000004-0000-0000-0000-000000000003', 'Continue', 1),
    ('c1000004-0000-0000-0000-000000000003', 'b1000004-0000-0000-0000-000000000003', 'b1000004-0000-0000-0000-000000000004', 'I''m ready to ship!', 1),
    ('c1000004-0000-0000-0000-000000000004', 'b1000004-0000-0000-0000-000000000003', 'b1000004-0000-0000-0000-000000000005', 'I''m blocked by...', 2),
    ('c1000004-0000-0000-0000-000000000005', 'b1000004-0000-0000-0000-000000000004', 'b1000004-0000-0000-0000-000000000006', 'Done!', 1),
    ('c1000004-0000-0000-0000-000000000006', 'b1000004-0000-0000-0000-000000000005', 'b1000004-0000-0000-0000-000000000006', 'Got it, I''ll simplify.', 1)
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.path_npc_conversations
  SET root_node_id = 'b1000004-0000-0000-0000-000000000001'
  WHERE id = 'a1000001-0000-0000-0000-000000000004'
    AND root_node_id IS NULL;

  -- ============================================================
  -- DAY 5: Sprint Retrospective with Alex
  -- Tree: [statement] → "Got it!" → [end]
  -- ============================================================

  INSERT INTO public.path_npc_conversation_nodes (id, conversation_id, npc_avatar_id, node_type, text_content)
  VALUES
    ('b1000005-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000005', avatar_id, 'statement',
     'Great sprint! Let''s do a retrospective.' || E'\n\n' ||
     'I want you to think about the whole week:' || E'\n' ||
     '- What days did you look forward to?' || E'\n' ||
     '- What days felt like a grind?' || E'\n' ||
     '- When were you in flow? When were you frustrated?' || E'\n\n' ||
     'These aren''t just project questions — they''re career questions. The things that energized you? That''s data. The things that drained you? Also data.' || E'\n\n' ||
     'Let''s talk about what this means for your career.'),
    ('b1000005-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000005', avatar_id, 'end', '')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.path_npc_conversation_choices (id, from_node_id, to_node_id, choice_text, display_order)
  VALUES
    ('c1000005-0000-0000-0000-000000000001', 'b1000005-0000-0000-0000-000000000001', 'b1000005-0000-0000-0000-000000000002', 'Got it, I''ll reflect on this.', 1)
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.path_npc_conversations
  SET root_node_id = 'b1000005-0000-0000-0000-000000000001'
  WHERE id = 'a1000001-0000-0000-0000-000000000005'
    AND root_node_id IS NULL;

  -- ============================================================
  -- REPLACE path_content rows for all 5 NPC activities
  -- Uses fixed UUIDs + ON CONFLICT DO NOTHING for idempotency
  -- ============================================================

  INSERT INTO public.path_content (id, activity_id, content_type, content_title, metadata, display_order, created_at)
  VALUES
    ('d1000001-0000-0000-0000-000000000001', '9f434488-e3e8-44dd-8a24-205e8c95568c', 'npc_chat', 'PM Alex Introduction',
     '{"conversation_id": "a1000001-0000-0000-0000-000000000001"}'::jsonb, 1, NOW()),
    ('d1000001-0000-0000-0000-000000000002', '51ee205c-bb52-4a87-a0c1-3af6c4a21ba0', 'npc_chat', 'Requirements Review with Alex',
     '{"conversation_id": "a1000001-0000-0000-0000-000000000002"}'::jsonb, 1, NOW()),
    ('d1000001-0000-0000-0000-000000000003', '439b6bea-0914-4e09-aa0d-e8ff3c15227d', 'npc_chat', 'Sprint Check-in with Alex',
     '{"conversation_id": "a1000001-0000-0000-0000-000000000003"}'::jsonb, 1, NOW()),
    ('d1000001-0000-0000-0000-000000000004', '3dc1dbbe-8229-43ce-9fcd-3e6a17e1935a', 'npc_chat', 'Final Review with Alex',
     '{"conversation_id": "a1000001-0000-0000-0000-000000000004"}'::jsonb, 1, NOW()),
    ('d1000001-0000-0000-0000-000000000005', '56504356-073f-4ee4-bd04-4193221751b5', 'npc_chat', 'Sprint Retrospective with Alex',
     '{"conversation_id": "a1000001-0000-0000-0000-000000000005"}'::jsonb, 1, NOW())
  ON CONFLICT (activity_id, display_order) DO UPDATE
    SET id           = EXCLUDED.id,
        content_type  = EXCLUDED.content_type,
        content_title = EXCLUDED.content_title,
        metadata      = EXCLUDED.metadata;

END $$;
