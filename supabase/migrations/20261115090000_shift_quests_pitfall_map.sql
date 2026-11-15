-- SHIFT High Island: the pitfall quest map (Season 1).
--
-- Design: docs/designs/shift-high-quest-pitfalls.md (decided 2026-11-15).
-- Content only: no table, column or schema version changes.
--
--   * The seven version-1 main quests are retired. Seven new main quests take
--     milestones 1 to 7, grouped by act on the web: 1-3 find your stakeholder,
--     4-6 build what matters, 7 scale. Each names one pitfall (the pitfall
--     copy itself lives in the web app, components/shift/island/copy.ts).
--   * take-the-keys, help-another-builder-move and improve-our-community come
--     back as published side quests with the same copy and no milestone, so
--     they no longer grow the tree. They get new slugs (side-take-the-keys,
--     side-help-a-builder, side-improve-community): 20261111090700 sets
--     milestones by slug, and every migration here must apply twice.
--   * Four new published side quests make the first conversation less scary
--     (stakeholder map, practice talk, question check, warm intro).
--   * Draft side quests point at the new milestones (absolute values);
--     side-fix-one-thing is retired (main quest 5 does the same thing).
--   * shift_quest_admin_report counts feedback decisions from the new build
--     quests (in-their-hands, run-the-loop); the body is otherwise unchanged.
--
-- Prod-first and idempotent: retire before insert (one published template per
-- slug and per milestone), inserts skip existing (slug, version), updates set
-- absolute values. Production had no quest instances when this was written.

-- ---------------------------------------------------------------------------
-- Retire the version-1 main quests and side-fix-one-thing
-- ---------------------------------------------------------------------------

UPDATE public.shift_quest_templates
SET status = 'retired'
WHERE version = 1 AND status <> 'retired' AND slug IN (
  'find-something-worth-fixing',
  'make-it-exist',
  'let-reality-surprise-you',
  'give-them-a-reason-to-return',
  'take-the-keys',
  'help-another-builder-move',
  'improve-our-community',
  'side-fix-one-thing'
);

-- ---------------------------------------------------------------------------
-- The seven main quests
-- ---------------------------------------------------------------------------

INSERT INTO public.shift_quest_templates (
  slug, version, title, purpose, routes, examples, evidence_criteria, reflection_prompt, support_options,
  repeatable, status, sort_order, milestone, side, route_keys, requires_milestones, requires_slugs, branch_of, icon
)
VALUES
(
  'meet-one-real-person', 1, 'เจอคนจริงคนแรก',
  'เลือกคนหนึ่งคนที่เจอปัญหานี้จริง แล้วไปคุยกับเขา ก่อนเริ่มสร้างอะไร',
  'ทุกเส้นทาง',
  E'ไม่ใช่ "นักเรียน" แต่เป็น "นักเรียน ม.6 ที่อ่านหนังสือสอบคนเดียวตอนดึก"\nคุยกับบรรณารักษ์โรงเรียน 15 นาที เรื่องที่นักเรียนหาหนังสือไม่เจอ',
  'สรุปแบบไม่ระบุตัวตนว่าเขาเป็นใคร (บอกแค่บทบาท เช่น "แม่ค้าหน้าโรงเรียน") คุยกันที่ไหน นานแค่ไหน และเขาเล่าอะไรที่คุณไม่เคยรู้ ห้ามใส่ชื่อจริง เบอร์โทร หรือที่อยู่',
  'ก่อนคุย คุณกลัวอะไร แล้วมันเกิดขึ้นจริงไหม',
  'ให้พี่เลี้ยงช่วยดูคำถามก่อนไปคุย หรือขอให้พี่ช่วยแนะนำคนที่น่าคุยด้วยในห้อง help ก่อนไปเจอใคร บอกพ่อแม่หรือครูว่าจะไปคุยกับใคร และนัดที่โรงเรียน ที่สาธารณะ หรือคุยออนไลน์โดยมีคนอื่นอยู่ด้วย',
  true, 'published', 10, 1, false, NULL, '{}', '{}', NULL, NULL
),
(
  'real-stories-not-compliments', 1, 'ฟังเรื่องจริง ไม่ใช่คำชม',
  'คุยกับคนที่เจอปัญหานี้อีกอย่างน้อย 3 คน แล้วฟังเรื่องที่เกิดขึ้นจริง ไม่ใช่ความเห็นต่อไอเดียของคุณ',
  'ทุกเส้นทาง',
  E'แทนที่จะถาม "ถ้ามีแอปนี้จะใช้ไหม" ให้ถาม "ครั้งล่าสุดที่ลืมส่งงาน เกิดอะไรขึ้น"\nคุยกับเจ้าของร้าน 3 ร้าน แล้วพบว่าปัญหาจริงไม่ใช่ลูกค้าน้อย แต่คือเตรียมของไม่ทัน',
  'สรุปแบบไม่ระบุตัวตนว่าคุยกับใครบ้าง (บอกแค่บทบาท) เรื่องจริงหนึ่งเรื่องที่เขาเล่า และสิ่งที่คุณเคยเชื่อแต่ตอนนี้ไม่แน่ใจแล้ว',
  'เรื่องไหนที่ทำให้คุณเปลี่ยนความคิด',
  'ซ้อมคุยกับเพื่อนบนเกาะก่อนได้ที่กองไฟ หรือให้พี่เลี้ยงช่วยดูว่าคำถามของคุณชวนให้เขาชม หรือชวนให้เขาเล่าเรื่องจริง ก่อนไปเจอใคร บอกพ่อแม่หรือครู และนัดในที่ที่มีคนอื่นอยู่ด้วย',
  true, 'published', 20, 2, false, NULL, '{}', '{}', NULL, NULL
),
(
  'first-partner', 1, 'ได้พันธมิตรคนแรก',
  'ชวนคนที่เกี่ยวกับปัญหานี้มาเป็นพันธมิตร ให้เขาตกลงทำขั้นต่อไปกับคุณ โดยมีวันที่ชัดเจน',
  'ทุกเส้นทาง',
  E'ครูแนะแนวตกลงให้ลองเครื่องมือกับนักเรียน ม.6 หนึ่งห้อง วันศุกร์หน้า\nร้านข้าวหน้าโรงเรียนให้ลองระบบสั่งล่วงหน้าหนึ่งสัปดาห์',
  'พันธมิตรเป็นใคร (บอกแค่บทบาท เช่น "ครูที่ปรึกษาชมรมดนตรี" หรือ "ร้านกาแฟแถวโรงเรียน") เขาตกลงทำอะไร วันไหน และเขาได้อะไรจากการช่วยคุณ ห้ามใส่ชื่อจริงหรือช่องทางติดต่อ',
  'ทำไมเขาถึงยอมช่วย',
  'ยังหาพันธมิตรไม่เจอ ขอให้พี่ช่วยแนะนำคนในเครือข่าย SHIFT ได้ในห้อง help (พี่แนะนำในห้องรวมเท่านั้น) ก่อนเจอผู้ใหญ่ที่ไม่รู้จัก บอกพ่อแม่หรือครู และนัดในที่ที่มีคนอื่นอยู่ด้วย',
  true, 'published', 30, 3, false, NULL, '{}', '{}', NULL, NULL
),
(
  'in-their-hands', 1, 'ส่งชิ้นแรกถึงมือเขา',
  'สร้างชิ้นเล็กที่สุดที่แก้เรื่องหนึ่งเรื่องที่พันธมิตรหรือผู้ใช้เล่าให้ฟัง แล้วให้เขาลองภายใน 7 วัน',
  'ทุกเส้นทาง',
  E'ซอฟต์แวร์: หน้าเว็บที่ทำได้อย่างเดียว แต่ทำเรื่องที่เขาเล่าได้จริง\nงานสร้างสรรค์: ฉากเดียว หรือเพลงท่อนเดียว ให้คนที่เขาพูดถึงลองดู\nบริการ: ลองให้บริการจริงหนึ่งครั้งกับพันธมิตร',
  'ลิงก์หรือคำอธิบายชิ้นงาน ใครลอง (บอกแค่บทบาท) และคุณเห็นอะไรตอนเขาลอง',
  'อะไรที่คุณตัดทิ้ง และทำไม',
  'นั่งทำด้วยกันที่กองไฟ หรือให้เพื่อนในห้อง help ช่วยดูว่าตัดได้อีกไหม',
  true, 'published', 40, 4, false, NULL, '{}', '{}', NULL, NULL
),
(
  'run-the-loop', 1, 'วนรอบ: ฟัง แก้ ลองใหม่',
  'เลือกปัญหาที่เห็นบ่อยที่สุดตอนเขาลอง แก้มัน แล้วให้คนเดิมลองอีกครั้ง ทำอย่างน้อย 2 รอบ',
  'ทุกเส้นทาง',
  E'รอบแรกคนหาปุ่มสั่งไม่เจอ ย้ายปุ่ม รอบสองทุกคนกดได้ใน 10 วินาที\nท่อนแรกของเพลงยาวไป คนข้าม ตัดเหลือครึ่ง แล้วเปิดให้คนเดิมฟังอีกครั้ง',
  'อย่างน้อย 2 รอบ: ก่อนแก้เป็นยังไง แก้อะไร หลังแก้เป็นยังไง เช่น ใช้เวลาน้อยลงไหม หรือติดน้อยลงไหม',
  'คำติข้อไหนที่ตอนแรกไม่อยากเชื่อ แต่กลับเป็นเรื่องจริง',
  'ถ้าเลือกไม่ได้ว่าจะแก้อะไรก่อน ถามพี่เลี้ยงในห้อง help',
  true, 'published', 50, 5, false, NULL, '{}', '{}', NULL, NULL
),
(
  'what-we-learned', 1, 'สรุปสิ่งที่ได้เรียนรู้',
  'เขียนสรุปสั้นๆ ว่าคุณเคยเชื่ออะไร เจออะไรจริง และจะทำอะไรต่อ แล้วเล่าให้พันธมิตรหรือเพื่อนบนเกาะฟัง',
  'ทุกเส้นทาง',
  E'เคยเชื่อว่านักเรียนไม่มีเวลา เจอว่าจริงๆ ไม่รู้ว่าจะเริ่มตรงไหน ต่อไปจะทำแค่หน้าแรกให้ชัด\nเล่าให้พันธมิตรฟัง แล้วเขาแนะนำคนที่ควรคุยต่อ',
  'สามบรรทัด: เคยเชื่อว่า... เจอว่าจริงๆ แล้ว... ต่อไปจะ... และบอกว่าเล่าให้ใครฟังแล้ว (บอกแค่บทบาท)',
  'ถ้าเริ่มใหม่วันนี้ คุณจะทำอะไรต่างไป',
  'เล่าในห้องรวมของเกาะ หรือแบ่งให้ทั้งเกาะด้วยเควสต์ "แบ่งสิ่งที่เรียนรู้ให้ทั้งเกาะ"',
  true, 'published', 60, 6, false, NULL, '{}', '{}', NULL, NULL
),
(
  'beyond-the-first', 1, 'ไปไกลกว่าคนแรก',
  'ให้คนที่ไม่รู้จักคุณใช้งานของคุณได้เอง โดยที่คุณไม่ต้องยืนอธิบาย',
  'ทุกเส้นทาง',
  E'ส่งลิงก์ให้ชมรมอื่นในโรงเรียน แล้วดูว่ามีใครใช้จบโดยไม่ถามคุณ\nพันธมิตรแนะนำร้านที่สอง และร้านนั้นเริ่มใช้เองได้',
  'กี่คนที่ใช้เองโดยคุณไม่ได้อธิบาย (บอกแค่บทบาท) เขาติดตรงไหน และมีใครกลับมาใช้อีกไหม',
  'อะไรที่ยังต้องมีคุณอยู่ งานถึงจะเดินได้',
  'ขอให้พี่ช่วยแนะนำกลุ่มใหม่ในเครือข่าย SHIFT ได้ในห้อง help หรือเช็กว่าคุณถือกุญแจโปรเจกต์เองได้ ด้วยเควสต์ "ถือกุญแจเอง"',
  true, 'published', 70, 7, false, NULL, '{}', '{}', NULL, NULL
)
ON CONFLICT (slug, version) DO NOTHING;

-- ---------------------------------------------------------------------------
-- The old community and ownership quests, back as side quests (new slugs)
-- ---------------------------------------------------------------------------

INSERT INTO public.shift_quest_templates (
  slug, version, title, purpose, routes, examples, evidence_criteria, reflection_prompt, support_options,
  repeatable, status, sort_order, milestone, side, route_keys, requires_milestones, requires_slugs, branch_of, icon
)
SELECT v.new_slug, 1, t.title, t.purpose, t.routes, t.examples, t.evidence_criteria, t.reflection_prompt, t.support_options,
  t.repeatable, 'published', v.sort_order, NULL, true, NULL, '{}', '{}', v.branch_of, v.icon
FROM public.shift_quest_templates t
JOIN (VALUES
  ('take-the-keys', 'side-take-the-keys', 220, 7::smallint, 'key'),
  ('help-another-builder-move', 'side-help-a-builder', 230, NULL::smallint, 'heart'),
  ('improve-our-community', 'side-improve-community', 240, NULL::smallint, 'link')
) AS v (slug, new_slug, sort_order, branch_of, icon) ON v.slug = t.slug
WHERE t.version = 1
ON CONFLICT (slug, version) DO NOTHING;

-- ---------------------------------------------------------------------------
-- New side quests for the first conversation (published, open any time)
-- ---------------------------------------------------------------------------

INSERT INTO public.shift_quest_templates (
  slug, version, title, purpose, routes, examples, evidence_criteria, reflection_prompt, support_options,
  repeatable, status, sort_order, milestone, side, route_keys, requires_milestones, requires_slugs, branch_of, icon
)
VALUES
(
  'side-stakeholder-map', 1, 'แผนที่คนรอบปัญหา',
  'เขียนว่าใครใช้ ใครจ่าย ใครตัดสินใจ และใครอาจขวาง แล้ววงคนที่ควรคุยก่อน',
  'ทุกเส้นทาง',
  'ระบบสั่งข้าวล่วงหน้า: นักเรียนใช้ ผู้ปกครองจ่าย แม่ค้าตัดสินใจ ฝ่ายอาคารอาจขวาง',
  'แผนที่ (บอกแค่บทบาท) และเหตุผลที่เลือกคนแรก',
  'คนไหนที่คุณไม่เคยนึกถึง จนได้เขียนแผนที่นี้',
  'ให้พี่เลี้ยงช่วยดูแผนที่ในห้อง help ได้',
  false, 'published', 101, NULL, true, NULL, '{}', '{}', 1, 'scroll'
),
(
  'side-practice-talk', 1, 'ซ้อมคุยกับเพื่อนบนเกาะ',
  'ซ้อมคุย 10 นาทีกับเพื่อนบนเกาะ ให้เขาเล่นเป็นคนที่คุณจะไปคุยด้วย แล้วสลับกัน',
  'ทุกเส้นทาง',
  'นั่งที่กองไฟ ผลัดกันเป็นคนถามและคนตอบ คนละ 10 นาที',
  'ซ้อมกับใคร (บอกแค่บทบาท) คำถามไหนได้เรื่องจริง คำถามไหนได้แต่คำชม',
  'คำถามไหนที่คุณจะไม่ใช้อีก',
  'หาคนซ้อมด้วยได้ที่กองไฟ หรือในห้อง help',
  true, 'published', 102, NULL, true, NULL, '{}', '{}', 2, 'bubble'
),
(
  'side-question-check', 1, 'ให้พี่ช่วยดูคำถาม',
  'เขียน 3 คำถามที่จะใช้คุย แล้วให้พี่เลี้ยงช่วยดูในห้อง help ก่อนไปคุยจริง',
  'ทุกเส้นทาง',
  'เปลี่ยน "ถ้ามีแอปนี้จะใช้ไหม" เป็น "ครั้งล่าสุดที่เกิดเรื่องนี้ คุณทำยังไง"',
  '3 คำถามก่อนและหลังแก้',
  'คำถามข้อไหนที่เปลี่ยนมากที่สุด เพราะอะไร',
  'โพสต์คำถามในห้อง help แล้วพี่เลี้ยงจะช่วยดู',
  false, 'published', 103, NULL, true, NULL, '{}', '{}', 1, 'check'
),
(
  'side-warm-intro', 1, 'ขอให้พี่ช่วยแนะนำ',
  'บอกพี่เลี้ยงในห้อง help ว่าอยากคุยกับคนแบบไหน และทำไม พี่จะช่วยหาคนในเครือข่าย SHIFT แล้วแนะนำในห้องรวม',
  'ทุกเส้นทาง',
  'อยากคุยกับเจ้าของร้านอาหารที่ส่งเดลิเวอรีเอง เพราะอยากรู้ว่าวันที่ออร์เดอร์เยอะ เขาจัดการยังไง',
  'ขอคนแบบไหน ได้คุยกับใคร (บอกแค่บทบาท) และได้อะไร',
  'ถ้าไม่มีคนแนะนำ คุณจะหาคนแบบนี้ได้จากที่ไหนอีก',
  'พี่แนะนำในห้องรวมเท่านั้น ไม่ใช่ทางข้อความส่วนตัว ก่อนเจอผู้ใหญ่ที่ไม่รู้จัก บอกพ่อแม่หรือครู และนัดในที่ที่มีคนอื่นอยู่ด้วย',
  false, 'published', 104, NULL, true, NULL, '{}', '{}', 3, 'mail'
)
ON CONFLICT (slug, version) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Draft side quests: point at the new milestones (absolute values)
-- ---------------------------------------------------------------------------

UPDATE public.shift_quest_templates t
SET requires_milestones = v.requires_milestones, branch_of = v.branch_of
FROM (VALUES
  ('side-five-voices', '{1}'::smallint[], 1::smallint),
  ('side-open-on-phone', '{4}'::smallint[], 4::smallint),
  ('side-readme', '{4}'::smallint[], 4::smallint),
  ('side-thirty-second-cut', '{4}'::smallint[], 4::smallint),
  ('side-clear-offer', '{4}'::smallint[], 4::smallint),
  ('side-outside-circle', '{4}'::smallint[], 4::smallint),
  ('side-demo-three-minutes', '{4}'::smallint[], 4::smallint),
  ('side-share-a-lesson', '{6}'::smallint[], 6::smallint),
  ('side-handoff-page', '{}'::smallint[], 7::smallint),
  ('side-review-a-friend', '{}'::smallint[], NULL::smallint)
) AS v (slug, requires_milestones, branch_of)
WHERE t.slug = v.slug AND t.version = 1 AND t.side AND t.status <> 'retired'
  AND (t.requires_milestones IS DISTINCT FROM v.requires_milestones OR t.branch_of IS DISTINCT FROM v.branch_of);

-- ---------------------------------------------------------------------------
-- Admin report: feedback decisions now come from the build quests
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.shift_quest_admin_report(p_actor text, p_days integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
  v_since timestamptz := now() - make_interval(days => LEAST(GREATEST(COALESCE(p_days, 14), 1), 365));
  v_students uuid[];
BEGIN
  SELECT COALESCE(array_agg(id), '{}') INTO v_students
  FROM public.shift_quest_members WHERE onboarded_at IS NOT NULL AND erased_at IS NULL;

  PERFORM public.shift_quest__audit(v_me.id, 'report_view', 'report', NULL);
  RETURN jsonb_build_object(
    'window_days', LEAST(GREATEST(COALESCE(p_days, 14), 1), 365),
    'members_onboarded', cardinality(v_students),
    'members_started', (
      SELECT count(DISTINCT member_id) FROM (
        SELECT member_id FROM public.shift_quest_instances
        UNION ALL SELECT member_id FROM public.shift_quest_progress
      ) x WHERE member_id = ANY (v_students)
    ),
    'members_with_progress_in_window', (
      SELECT count(DISTINCT member_id) FROM public.shift_quest_progress
      WHERE created_at >= v_since AND member_id = ANY (v_students)
    ),
    'members_submitting_in_window', (
      SELECT count(DISTINCT submitted_by) FROM public.shift_quest_submissions
      WHERE created_at >= v_since AND submitted_by = ANY (v_students)
    ),
    'quests_by_state', COALESCE((
      SELECT jsonb_object_agg(state, n) FROM (
        SELECT state, count(*) AS n FROM public.shift_quest_instances GROUP BY state
      ) x
    ), '{}'::jsonb),
    'reviews_in_window', COALESCE((
      SELECT jsonb_object_agg(outcome, n) FROM (
        SELECT outcome, count(*) AS n FROM public.shift_quest_reviews WHERE created_at >= v_since GROUP BY outcome
      ) x
    ), '{}'::jsonb),
    'review_backlog', (
      SELECT count(*) FROM public.shift_quest_instances WHERE state IN ('submitted', 'appealed')
    ),
    'review_median_hours', (
      SELECT round((percentile_cont(0.5) WITHIN GROUP (
        ORDER BY extract(epoch FROM (r.created_at - s.created_at)) / 3600))::numeric, 1)
      FROM public.shift_quest_reviews r JOIN public.shift_quest_submissions s ON s.id = r.submission_id
      WHERE r.created_at >= v_since
    ),
    'projects_with_feedback_decision', (
      SELECT count(DISTINCT i.project_id) FROM public.shift_quest_instances i
      JOIN public.shift_quest_templates t ON t.id = i.template_id
      WHERE i.state = 'approved' AND t.slug IN ('in-their-hands', 'run-the-loop')
    ),
    'ownership', jsonb_build_object(
      'projects', (SELECT count(*) FROM public.shift_quest_projects WHERE archived_at IS NULL),
      'all_checks_done', (
        SELECT count(*) FROM public.shift_quest_projects p
        WHERE p.archived_at IS NULL AND NOT EXISTS (
          SELECT 1 FROM public.shift_quest_ownership_checks o
          WHERE o.project_id = p.id AND o.state NOT IN ('demonstrated', 'not_applicable')
        )
      ),
      'with_blocker', (
        SELECT count(DISTINCT project_id) FROM public.shift_quest_ownership_checks WHERE state = 'needs_help'
      )
    ),
    'help', jsonb_build_object(
      'opened_in_window', (SELECT count(*) FROM public.shift_quest_help_requests WHERE created_at >= v_since),
      'resolved_in_window', (SELECT count(*) FROM public.shift_quest_help_requests
                             WHERE status = 'resolved' AND resolved_at >= v_since),
      'open_now', (SELECT count(*) FROM public.shift_quest_help_requests WHERE status IN ('open', 'claimed'))
    ),
    'coins', jsonb_build_object(
      'awarded_in_window', (SELECT COALESCE(sum(amount), 0) FROM public.shift_quest_ledger
                            WHERE kind = 'award' AND created_at >= v_since),
      'reversed_in_window', (SELECT COALESCE(-sum(amount), 0) FROM public.shift_quest_ledger
                             WHERE kind = 'reversal' AND created_at >= v_since),
      'members_awarded', (SELECT count(DISTINCT member_id) FROM public.shift_quest_ledger WHERE kind = 'award'),
      'awards_not_issued', (SELECT count(*) FROM public.shift_quest_instances
                            WHERE state = 'approved' AND award_status = 'not_issued')
    ),
    'redemptions', COALESCE((
      SELECT jsonb_object_agg(status, n) FROM (
        SELECT status, count(*) AS n FROM public.shift_quest_redemptions GROUP BY status
      ) x
    ), '{}'::jsonb),
    'sharing', jsonb_build_object(
      'posted', (SELECT count(*) FROM public.shift_quest_shares WHERE status = 'queued' AND updated_at >= v_since),
      'peer_declined', (SELECT count(*) FROM public.shift_quest_shares WHERE status = 'peer_declined' AND updated_at >= v_since)
    ),
    'delivery', jsonb_build_object(
      'failed', (SELECT count(*) FROM public.shift_quest_outbox WHERE status = 'failed'),
      'blocked', (SELECT count(*) FROM public.shift_quest_outbox WHERE status = 'blocked')
    ),
    'access_denied_in_window', (
      SELECT count(*) FROM public.shift_quest_audit WHERE outcome LIKE 'denied%' AND created_at >= v_since
    ),
    -- Island and seasons (20261111090700_shift_quests_island): counts only.
    'island', public.shift_quest__island_report(v_since)
  );
END;
$$;
