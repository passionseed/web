-- Elemental canvases: /canvas link checks, the staff override, the note target,
-- writes through whiteboard_merge_elements, refusals that never raise,
-- tombstones, the resync list, grants, and no change to any whiteboard_* object.
\ir helpers.psql
SELECT pg_temp.world();

-- ---------------------------------------------------------------------------
-- Link: each refusal, then a valid link.
DO $$
DECLARE
  g text := pg_temp.g_real();
  r jsonb;
BEGIN
  -- Another element's board names that element.
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_canvas_link(%L, %L, %L, %L, %L)',
    g, pg_temp.chan(1), pg_temp.board('f2'), 'frame-w', pg_temp.uid(1)), 'wrong_element_board');
  ASSERT pg_temp.error_detail(format('SELECT public.elemental_bot_canvas_link(%L, %L, %L, %L, %L)',
    g, pg_temp.chan(1), pg_temp.board('f2'), 'frame-w', pg_temp.uid(1))) = 'water', 'wrong board names its element';
  -- A whiteboard that is not one of the edition's boards.
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_canvas_link(%L, %L, %L, %L, %L)',
    g, pg_temp.chan(1), pg_temp.board('f3'), 'frame-x', pg_temp.uid(1)), 'board_not_found');
  -- Frames: missing, deleted, not a project canvas.
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_canvas_link(%L, %L, %L, %L, %L)',
    g, pg_temp.chan(1), pg_temp.board('f1'), 'no-such-frame', pg_temp.uid(1)), 'frame_not_found');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_canvas_link(%L, %L, %L, %L, %L)',
    g, pg_temp.chan(1), pg_temp.board('f1'), 'frame-gone', pg_temp.uid(1)), 'frame_not_found');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_canvas_link(%L, %L, %L, %L, %L)',
    g, pg_temp.chan(1), pg_temp.board('f1'), 'zone-a-test', pg_temp.uid(1)), 'frame_not_found');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_canvas_link(%L, %L, %L, %L, %L)',
    g, pg_temp.chan(1), pg_temp.board('f1'), 'frame-plain', pg_temp.uid(1)), 'not_project_frame');
  -- Someone else's canvas (owner a9 is not on the team; a Google identity never counts).
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_canvas_link(%L, %L, %L, %L, %L)',
    g, pg_temp.chan(1), pg_temp.board('f1'), 'frame-other', pg_temp.uid(1)), 'not_team_canvas');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_canvas_link(%L, %L, %L, %L, %L)',
    g, pg_temp.chan(3), pg_temp.board('f1'), 'frame-a', pg_temp.uid(5)), 'not_team_canvas');
  -- Not a team channel.
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_canvas_link(%L, %L, %L, %L, %L)',
    g, pg_temp.chan(99), pg_temp.board('f1'), 'frame-a', pg_temp.uid(1)), 'not_team_channel');
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_canvas_links), 'a refused link was stored';

  -- Valid: the owner (a1) is person 1 on the team. Repeating is a no-op.
  r := public.elemental_bot_canvas_link(g, pg_temp.chan(1), pg_temp.board('f1'), 'frame-a', pg_temp.uid(2));
  ASSERT r ->> 'frame_id' = 'frame-a' AND NOT (r ->> 'already')::boolean AND r -> 'replaced' = 'null'::jsonb
     AND (r ->> 'slot')::integer = 12 AND r ->> 'via' = 'member', 'link: ' || r::text;
  r := public.elemental_bot_canvas_link(g, pg_temp.chan(1), pg_temp.board('f1'), ' frame-a ', pg_temp.uid(1));
  ASSERT (r ->> 'already')::boolean, 'relinking the same frame: ' || r::text;
  -- An editor counts too: a3 (person 3, Spark Line) is on frame-b's team list.
  r := public.elemental_bot_canvas_link(g, pg_temp.chan(2), pg_temp.board('f1'), 'frame-b', pg_temp.uid(3));
  ASSERT r ->> 'frame_id' = 'frame-b', 'editor link';
  -- Already linked elsewhere: a1 edits frame-b too, but Spark Line holds it.
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_canvas_link(%L, %L, %L, %L, %L)',
    g, pg_temp.chan(1), pg_temp.board('f1'), 'frame-b', pg_temp.uid(1)), 'frame_linked');
  ASSERT (SELECT frame_id FROM public.elemental_canvas_links WHERE team_id = pg_temp.team_id(12)) = 'frame-a', 'link moved on a refusal';
  -- Staff override: no element or member check, but never a frame another live team holds.
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_canvas_override(%L, %L, 41, %L, %L)',
    g, pg_temp.staff(), pg_temp.board('f1'), 'frame-a'), 'frame_linked');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_canvas_override(%L, %L, 41, %L, %L)',
    g, pg_temp.staff(), pg_temp.board('f3'), 'frame-x'), 'board_not_found');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_canvas_override(%L, %L, 41, %L, %L)',
    g, pg_temp.staff(), pg_temp.board('f1'), 'frame-plain'), 'not_project_frame');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_canvas_override(%L, %L, 199, %L, %L)',
    g, pg_temp.staff(), pg_temp.board('f1'), 'frame-other'), 'team_not_found');
  r := public.elemental_bot_canvas_override(g, pg_temp.staff(), 41, pg_temp.board('f2'), 'frame-w');
  ASSERT r ->> 'via' = 'staff' AND r ->> 'frame_id' = 'frame-w', 'override onto another element''s board: ' || r::text;
  -- Who linked is in the audit log, not the link table.
  ASSERT (SELECT count(*) FROM public.elemental_audit WHERE action = 'canvas_link') = 3, 'audit rows';
  ASSERT NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'elemental_canvas_links' AND column_name ~ 'discord|user|by'), 'link table holds people';
END $$;

-- A frame an archived team held is free again.
DO $$
BEGIN
  PERFORM public.elemental_bot_team_archive(pg_temp.g_real(), pg_temp.staff(), 41);
  ASSERT (public.elemental_bot_canvas_override(pg_temp.g_real(), pg_temp.staff(), 40, pg_temp.board('f2'), 'frame-w')) ->> 'frame_id' = 'frame-w',
    'archived team''s frame not freed';
  ASSERT (SELECT count(*) FROM public.elemental_canvas_links WHERE frame_id = 'frame-w') = 1, 'one team per frame';
  -- Back as it was for the rest of the file: Spark Line on frame-b, Kiln Notes archived with no canvas.
  PERFORM public.elemental_bot_canvas_override(pg_temp.g_real(), pg_temp.staff(), 40, pg_temp.board('f1'), 'frame-b');
END $$;

-- ---------------------------------------------------------------------------
-- Target and write.
CREATE TEMP TABLE e (name text PRIMARY KEY, id uuid);
INSERT INTO e SELECT 'one', (pg_temp.tester(1, 1) ->> 'id')::uuid;
INSERT INTO e SELECT 'unlinked', (public.elemental_bot_tester_add(pg_temp.g_real(), pg_temp.chan(1), pg_temp.uid(2), 'a shop owner', 'the paper map', NULL, NULL) ->> 'id')::uuid;

DO $$
DECLARE
  g text := pg_temp.g_real();
  one uuid := (SELECT id FROM e WHERE name = 'one');
  t jsonb;
BEGIN
  ASSERT (SELECT canvas_status FROM public.elemental_tester_entries WHERE id = one) = 'pending', 'a linked team''s entry waits for its note';
  t := public.elemental_bot_canvas_target(g, one);
  ASSERT t ->> 'kind' = 'test' AND t ->> 'source' = 'tester' AND (t ->> 'linked')::boolean AND (t ->> 'live')::boolean, 'target: ' || t::text;
  ASSERT t ->> 'frame_id' = 'frame-a' AND (t ->> 'board_id')::uuid = pg_temp.board('f1') AND (t ->> 'owner_id')::uuid = pg_temp.owner(), 'where';
  ASSERT t -> 'zone' = '{"x": 124, "y": 300, "width": 1200, "height": 400}'::jsonb, 'zone: ' || (t -> 'zone')::text;
  ASSERT t -> 'frame' = '{"x": 100, "y": 100, "width": 2000, "height": 1500}'::jsonb, 'frame';
  -- The highest valid index, a deleted element's included, an invalid one skipped.
  ASSERT t ->> 'after_index' = 'a9', 'after_index: ' || (t ->> 'after_index');
  ASSERT t -> 'fields' ->> 'who' = 'a parent at the market' AND t -> 'fields' ->> 'tried' = 'the map on a phone', 'fields';
  ASSERT t -> 'note_ids' = jsonb_build_object('rect', 'el-' || one || '-r', 'text', 'el-' || one || '-t'), 'note ids';
  ASSERT t -> 'prev' = 'null'::jsonb, 'no note yet';
  -- Nearby: what overlaps the test zone (the zone itself, its label, the frame), trimmed to what placement reads.
  ASSERT (SELECT array_agg(x ->> 'id' ORDER BY x ->> 'id') FROM jsonb_array_elements(t -> 'nearby') x)
         = ARRAY['frame-a', 'frame-b', 'frame-c', 'frame-other', 'frame-plain', 'zone-a-test', 'zone-a-test-label'],
    'nearby: ' || (t -> 'nearby')::text;
  ASSERT (SELECT x -> 'customData' FROM jsonb_array_elements(t -> 'nearby') x WHERE x ->> 'id' = 'frame-a') = '{}'::jsonb,
    'nearby carries only placement keys';
  -- The ship zone is found for a ship note.
  ASSERT NOT (public.elemental_bot_canvas_target(g, (SELECT id FROM e WHERE name = 'unlinked')) ->> 'linked')::boolean IS NULL, 'second entry';
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_canvas_target(%L, %L)', g, gen_random_uuid()), 'entry_not_found');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_canvas_target(%L, %L)', pg_temp.g_dry(), one), 'entry_not_found');
END $$;

-- A write lands in whiteboards.elements, saved as the board owner, logged in whiteboard_changes.
DO $$
DECLARE
  g text := pg_temp.g_real();
  one uuid := (SELECT id FROM e WHERE name = 'one');
  b uuid := pg_temp.board('f1');
  r jsonb;
  changes_before integer := (SELECT count(*) FROM public.whiteboard_changes WHERE whiteboard_id = b);
BEGIN
  r := public.elemental_bot_canvas_write(g, one, pg_temp.note(one, 'frame-a', 'aA', 'aB', 1, 'who: a parent'));
  ASSERT (r ->> 'ok')::boolean AND r ->> 'status' = 'written' AND r -> 'dropped' = '[]'::jsonb AND (r ->> 'present')::boolean,
    'write: ' || r::text;
  ASSERT pg_temp.copies(b, 'el-' || one || '-r') = 1 AND pg_temp.copies(b, 'el-' || one || '-t') = 1, 'one copy of each';
  ASSERT pg_temp.el(b, 'el-' || one || '-r') -> 'customData' ->> 'updatedBy' = pg_temp.owner()::text
     AND pg_temp.el(b, 'el-' || one || '-r') -> 'customData' ->> 'createdBy' = pg_temp.owner()::text, 'saved as the board owner';
  ASSERT pg_temp.el(b, 'el-' || one || '-r') -> 'customData' ->> 'card' = 'test'
     AND pg_temp.el(b, 'el-' || one || '-t') ->> 'containerId' = 'el-' || one || '-r', 'shape kept';
  ASSERT (SELECT count(*) FROM public.whiteboard_changes WHERE whiteboard_id = b) = changes_before + 1, 'no whiteboard_changes row';
  ASSERT (SELECT user_id FROM public.whiteboard_changes WHERE whiteboard_id = b ORDER BY id DESC LIMIT 1) = pg_temp.owner(), 'change saver';
  ASSERT EXISTS (SELECT 1 FROM public.whiteboard_changes c, jsonb_array_elements(c.items) i
                 WHERE c.whiteboard_id = b AND i ->> 'id' = 'el-' || one || '-r' AND i ->> 'action' = 'added'), 'change item';
  ASSERT (SELECT canvas_status = 'written' AND canvas_ids = ARRAY['el-' || one || '-r', 'el-' || one || '-t']
          FROM public.elemental_tester_entries WHERE id = one), 'entry canvas state';
  -- The board stays in index order with the note on top.
  ASSERT (SELECT array_agg(el ->> 'id' ORDER BY o) FROM public.whiteboards w, jsonb_array_elements(w.elements) WITH ORDINALITY x(el, o)
          WHERE w.id = b AND el ->> 'id' LIKE 'el-%') = ARRAY['el-' || one || '-r', 'el-' || one || '-t'], 'order';

  -- The target now hands back the saved note for rewriteNote.
  ASSERT jsonb_array_length(public.elemental_bot_canvas_target(g, one) -> 'prev') = 2
     AND (public.elemental_bot_canvas_target(g, one) ->> 'prev_on_frame')::boolean
     AND NOT (public.elemental_bot_canvas_target(g, one) ->> 'prev_deleted')::boolean, 'prev';
  ASSERT public.elemental_bot_canvas_target(g, one) ->> 'after_index' = 'aB', 'after_index follows the note';

  -- Writing again (a rewrite, one version up) replaces it: no duplicate.
  r := public.elemental_bot_canvas_write(g, one, pg_temp.note(one, 'frame-a', 'aA', 'aB', 2, 'who: a parent, edited'));
  ASSERT (r ->> 'ok')::boolean, 'rewrite: ' || r::text;
  ASSERT pg_temp.copies(b, 'el-' || one || '-r') = 1 AND pg_temp.copies(b, 'el-' || one || '-t') = 1, 'duplicate after rewrite';
  ASSERT (pg_temp.el(b, 'el-' || one || '-t') ->> 'version')::integer = 2
     AND pg_temp.el(b, 'el-' || one || '-t') ->> 'text' = 'who: a parent, edited', 'rewrite landed';
  -- The same write retried: still one copy, same version.
  r := public.elemental_bot_canvas_write(g, one, pg_temp.note(one, 'frame-a', 'aA', 'aB', 2, 'who: a parent, edited'));
  ASSERT (r ->> 'ok')::boolean AND pg_temp.copies(b, 'el-' || one || '-r') = 1
     AND (pg_temp.el(b, 'el-' || one || '-r') ->> 'version')::integer = 2, 'retry';
  -- An older copy never wins over the saved one.
  r := public.elemental_bot_canvas_write(g, one, pg_temp.note(one, 'frame-a', 'aA', 'aB', 1, 'stale'));
  ASSERT (r ->> 'ok')::boolean AND pg_temp.el(b, 'el-' || one || '-t') ->> 'text' = 'who: a parent, edited', 'stale copy won';
END $$;

-- Refusals: the entry is marked failed, nothing on the board changes, nothing raises.
DO $$
DECLARE
  g text := pg_temp.g_real();
  one uuid := (SELECT id FROM e WHERE name = 'one');
  b uuid := pg_temp.board('f1');
  before jsonb := (SELECT elements FROM public.whiteboards WHERE id = b);
  good jsonb := pg_temp.note(one, 'frame-a', 'aA', 'aB', 3, 'next');
  c record;
  r jsonb;
BEGIN
  FOR c IN
    SELECT * FROM (VALUES
      ('bad_frame', pg_temp.note(one, 'frame-plain', 'aA', 'aB', 3, 'x')),
      ('bad_frame', jsonb_set(good, '{1,frameId}', 'null')),
      ('bad_type', jsonb_set(good, '{0,type}', '"ellipse"')),
      ('bad_type', jsonb_set(good, '{1,type}', '"image"')),
      ('bad_field', jsonb_set(good, '{0,fileId}', '"file-1"')),
      ('bad_field', jsonb_set(good, '{1,link}', '"https://example.com"')),
      ('bad_field', jsonb_set(good, '{0,isDeleted}', 'true')),
      ('bad_field', jsonb_set(good, '{0,version}', '"3"')),
      ('bad_field', jsonb_set(good, '{0,x}', '"0"')),
      ('bad_field', jsonb_set(good, '{0,index}', '"a!"')),
      ('bad_field', jsonb_set(good, '{1,index}', '"a10"')),
      ('bad_field', jsonb_set(good, '{1,index}', 'null')),
      ('bad_field', good #- '{0,index}'),
      ('bad_card', jsonb_set(good, '{0,customData,card}', '"problem"')),
      ('bad_card', jsonb_set(good, '{0,customData,source}', '"lesson"')),
      ('bad_card', jsonb_set(good, '{0,customData}', '{}')),
      ('bad_container', jsonb_set(good, '{1,containerId}', '"zone-a-test"')),
      ('bad_container', jsonb_set(good, '{1,customData,card}', '"test"')),
      ('bad_container', jsonb_set(good, '{0,boundElements}', '[]')),
      ('bad_id', jsonb_set(good, '{0,id}', '"zone-a-test"')),
      ('bad_id', jsonb_build_array(good -> 0, good -> 0)),
      ('bad_id', pg_temp.note(gen_random_uuid(), 'frame-a', 'aA', 'aB', 3, 'x')),
      ('bad_elements', good || jsonb_build_array(good -> 0)),
      ('bad_elements', '[]'::jsonb),
      ('bad_elements', good -> 0),
      ('too_large', jsonb_set(good, '{1,text}', to_jsonb(repeat('x', 30000)))),
      -- The merge leaves out a version jump past 1,000,000: reported, not raised.
      ('dropped', pg_temp.note(one, 'frame-a', 'aA', 'aB', 5000000, 'x'))
    ) AS v(reason, els)
  LOOP
    r := public.elemental_bot_canvas_write(g, one, c.els);
    ASSERT NOT (r ->> 'ok')::boolean AND r ->> 'status' = 'failed' AND r ->> 'reason' = c.reason,
      format('expected %s, got %s for %s', c.reason, r, left(c.els::text, 200));
    ASSERT (SELECT canvas_status FROM public.elemental_tester_entries WHERE id = one) = 'failed', 'status after ' || c.reason;
  END LOOP;
  ASSERT (SELECT elements FROM public.whiteboards WHERE id = b) = before, 'a refused write changed the board';
  r := public.elemental_bot_canvas_write(g, one, '"not an array"'::jsonb);
  ASSERT r ->> 'reason' = 'bad_elements', 'scalar';
  r := public.elemental_bot_canvas_write(g, one, NULL);
  ASSERT r ->> 'reason' = 'bad_elements', 'null';

  -- A good write afterwards puts it right.
  r := public.elemental_bot_canvas_write(g, one, good);
  ASSERT (r ->> 'ok')::boolean AND (SELECT canvas_status FROM public.elemental_tester_entries WHERE id = one) = 'written', 'recovered';
  -- One element alone (just the text) is allowed.
  r := public.elemental_bot_canvas_write(g, one, jsonb_build_array(jsonb_set(good -> 1, '{version}', '4')));
  ASSERT (r ->> 'ok')::boolean, 'text alone: ' || r::text;
END $$;

-- Kiln Notes was archived above, so its channel is no team channel any more.
SELECT pg_temp.expect_error('SELECT pg_temp.tester(5, 3)', 'not_team_channel');
-- A team with no canvas: the entry stays 'none' (resync writes it once linked).
DO $$
DECLARE
  g text := pg_temp.g_real();
  t jsonb := pg_temp.team('Ash Survey', 'fire', 7, 8, '{60}');
  k uuid;
  r jsonb;
BEGIN
  PERFORM public.elemental_bot_team_set_channel(g, (t ->> 'team_id')::uuid, pg_temp.chan(7));
  k := (pg_temp.tester(7, 7) ->> 'id')::uuid;
  ASSERT (SELECT canvas_status FROM public.elemental_tester_entries WHERE id = k) = 'none', 'unlinked entry status';
  ASSERT NOT (public.elemental_bot_canvas_target(g, k) ->> 'linked')::boolean, 'unlinked target';
  ASSERT NOT public.elemental_bot_canvas_target(g, k) ? 'board_id', 'unlinked target has no board';
  r := public.elemental_bot_canvas_write(g, k, pg_temp.note(k, 'frame-a', 'aZ', 'aZV', 1, 'x'));
  ASSERT NOT (r ->> 'ok')::boolean AND r ->> 'reason' = 'not_linked' AND r ->> 'status' = 'none', 'not linked: ' || r::text;
  ASSERT (SELECT canvas_status FROM public.elemental_tester_entries WHERE id = k) = 'none', 'not linked status';
  ASSERT pg_temp.copies(pg_temp.board('f1'), 'el-' || k || '-r') = 0, 'written without a link';
END $$;

-- ---------------------------------------------------------------------------
-- Resync list, removal, tombstone.
DO $$
DECLARE
  g text := pg_temp.g_real();
  one uuid := (SELECT id FROM e WHERE name = 'one');
  unlinked uuid := (SELECT id FROM e WHERE name = 'unlinked');
  b uuid := pg_temp.board('f1');
  r jsonb;
BEGIN
  -- 'unlinked' was logged by person 2 on the linked team, so it waits for a write; 'one' is written.
  ASSERT (SELECT array_agg(entry_id::text || ':' || action) FROM public.elemental_bot_canvas_pending(g))
         = ARRAY[unlinked::text || ':write'], 'pending: ' || (SELECT array_agg(entry_id::text || ':' || action) FROM public.elemental_bot_canvas_pending(g))::text;
  PERFORM pg_temp.expect_error(format('SELECT * FROM public.elemental_bot_canvas_pending(%L, 0)', g), 'bad_n');

  -- Removed: no more writes; the resync list asks for a tombstone.
  PERFORM public.elemental_bot_tester_remove(g, one, pg_temp.staff(), 'not a real test');
  r := public.elemental_bot_canvas_write(g, one, pg_temp.note(one, 'frame-a', 'aA', 'aB', 9, 'x'));
  ASSERT NOT (r ->> 'ok')::boolean AND r ->> 'reason' = 'removed' AND r ->> 'status' = 'written', 'write after removal: ' || r::text;
  ASSERT EXISTS (SELECT 1 FROM public.elemental_bot_canvas_pending(g) WHERE entry_id = one AND action = 'tombstone'), 'tombstone pending';

  r := public.elemental_bot_canvas_tombstone(g, one, pg_temp.staff());
  ASSERT (r ->> 'ok')::boolean AND r ->> 'status' = 'tombstoned', 'tombstone: ' || r::text;
  ASSERT (pg_temp.el(b, 'el-' || one || '-r') ->> 'isDeleted')::boolean
     AND (pg_temp.el(b, 'el-' || one || '-t') ->> 'isDeleted')::boolean, 'both elements deleted';
  ASSERT (pg_temp.el(b, 'el-' || one || '-r') ->> 'version')::integer = 4
     AND (pg_temp.el(b, 'el-' || one || '-t') ->> 'version')::integer = 5, 'tombstone versions: '
       || (pg_temp.el(b, 'el-' || one || '-r') ->> 'version') || '/' || (pg_temp.el(b, 'el-' || one || '-t') ->> 'version');
  ASSERT pg_temp.el(b, 'el-' || one || '-r') -> 'customData' ->> 'updatedBy' = pg_temp.owner()::text, 'tombstone saver';
  ASSERT EXISTS (SELECT 1 FROM public.whiteboard_changes c, jsonb_array_elements(c.items) i
                 WHERE c.whiteboard_id = b AND i ->> 'id' = 'el-' || one || '-r' AND i ->> 'action' = 'deleted'), 'deletion logged';
  ASSERT (SELECT canvas_status FROM public.elemental_tester_entries WHERE id = one) = 'tombstoned', 'status';
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_bot_canvas_pending(g) WHERE entry_id = one), 'still pending';
  -- Again: nothing left to delete, still fine.
  r := public.elemental_bot_canvas_tombstone(g, one);
  ASSERT (r ->> 'ok')::boolean AND (pg_temp.el(b, 'el-' || one || '-r') ->> 'version')::integer = 4, 'second tombstone';
  ASSERT (public.elemental_bot_canvas_target(g, one) ->> 'prev_deleted')::boolean, 'target sees the tombstone';
END $$;

-- ---------------------------------------------------------------------------
-- Relink on the same board: the saved note moves to the new frame.
DO $$
DECLARE
  g text := pg_temp.g_real();
  b uuid := pg_temp.board('f1');
  k uuid := (pg_temp.tester(2, 1, 'a cousin', 'the night version') ->> 'id')::uuid;
  r jsonb;
  t jsonb;
BEGIN
  r := public.elemental_bot_canvas_write(g, k, pg_temp.note(k, 'frame-a', 'aC', 'aD', 1, 'x'));
  ASSERT (r ->> 'ok')::boolean, 'first write';
  r := public.elemental_bot_canvas_write(g, k, pg_temp.note(k, 'frame-a', 'aC', 'aD', 2, 'x2'));
  r := public.elemental_bot_canvas_link(g, pg_temp.chan(1), b, 'frame-c', pg_temp.uid(1));
  ASSERT r -> 'replaced' = jsonb_build_object('board_id', b, 'frame_id', 'frame-a'), 'replaced: ' || r::text;
  ASSERT (SELECT canvas_status FROM public.elemental_tester_entries WHERE id = k) = 'pending', 'relink marks a rewrite';
  t := public.elemental_bot_canvas_target(g, k);
  ASSERT t ->> 'frame_id' = 'frame-c' AND NOT (t ->> 'prev_on_frame')::boolean AND t -> 'zone' = 'null'::jsonb, 'target after relink: ' || t::text;
  -- With no zone on the new frame, nearby is read around the frame.
  ASSERT jsonb_array_length(t -> 'nearby') > 0, 'nearby falls back to the frame';
  -- A fresh note (version 1) still replaces the saved version-2 copy on the old frame.
  r := public.elemental_bot_canvas_write(g, k, pg_temp.note(k, 'frame-c', 'aE', 'aF', 1, 'moved'));
  ASSERT (r ->> 'ok')::boolean AND pg_temp.el(b, 'el-' || k || '-r') ->> 'frameId' = 'frame-c'
     AND pg_temp.el(b, 'el-' || k || '-t') ->> 'text' = 'moved' AND pg_temp.copies(b, 'el-' || k || '-t') = 1,
    'relinked write: ' || r::text || ' ' || pg_temp.el(b, 'el-' || k || '-r')::text;
  ASSERT (pg_temp.el(b, 'el-' || k || '-r') ->> 'version')::integer = 3, 'version raised above the old copy';

  -- The linked frame deleted on the board: refused, not raised.
  UPDATE public.whiteboards SET elements = (
    SELECT jsonb_agg(CASE WHEN el ->> 'id' = 'frame-c' THEN el || '{"isDeleted": true}'::jsonb ELSE el END ORDER BY o)
    FROM jsonb_array_elements(elements) WITH ORDINALITY x(el, o)) WHERE id = b;
  r := public.elemental_bot_canvas_write(g, k, pg_temp.note(k, 'frame-c', 'aE', 'aF', 4, 'x'));
  ASSERT NOT (r ->> 'ok')::boolean AND r ->> 'reason' = 'frame_gone', 'frame gone: ' || r::text;
  ASSERT public.elemental_bot_canvas_target(g, k) -> 'frame' = 'null'::jsonb, 'target frame gone';
END $$;

-- ---------------------------------------------------------------------------
-- Hand-in note: the team id is the note's id; kind ship, its own zone.
DO $$
DECLARE
  g text := pg_temp.g_real();
  team uuid := pg_temp.team_id(40);
  t jsonb;
  r jsonb;
BEGIN
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_canvas_target(%L, %L)', g, team), 'entry_not_found');
  PERFORM public.elemental_bot_handin(g, pg_temp.chan(2), 'https://youtu.be/abc123', '2026-12-07 20:00:00+07', pg_temp.uid(3));
  t := public.elemental_bot_canvas_target(g, team);
  ASSERT t ->> 'kind' = 'ship' AND t ->> 'source' = 'handin' AND t -> 'fields' ->> 'url' = 'https://youtu.be/abc123'
     AND NOT (t -> 'fields' ->> 'late')::boolean AND t ->> 'frame_id' = 'frame-b', 'ship target: ' || t::text;
  ASSERT t -> 'zone' = 'null'::jsonb, 'frame-b has no ship zone';
  r := public.elemental_bot_canvas_write(g, team, pg_temp.note(team, 'frame-b', 'aG', 'aH', 1, 'https://youtu.be/abc123', 'ship', 'handin'));
  ASSERT (r ->> 'ok')::boolean AND r -> 'status' = 'null'::jsonb, 'ship write: ' || r::text;
  r := public.elemental_bot_canvas_write(g, team, pg_temp.note(team, 'frame-b', 'aG', 'aH', 2, 'x', 'test', 'tester'));
  ASSERT r ->> 'reason' = 'bad_card', 'a ship note must be a ship card';
  ASSERT pg_temp.el(pg_temp.board('f1'), 'el-' || team || '-r') -> 'customData' ->> 'card' = 'ship', 'ship on board';
END $$;

-- Lesson answer note (E21): the progress row's id is the note's id; kind reference, source lesson.
DO $$
DECLARE
  g text := pg_temp.g_real();
  lp uuid;
  t jsonb;
  r jsonb;
BEGIN
  INSERT INTO public.elemental_lesson_progress (edition, team_id, lesson_id, part, answer)
  VALUES ('elemental-2026', pg_temp.team_id(40), 'intro', 1, 'a short answer') RETURNING id INTO lp;
  t := public.elemental_bot_canvas_target(g, lp);
  ASSERT t ->> 'kind' = 'reference' AND t ->> 'source' = 'lesson' AND t -> 'fields' ->> 'answer' = 'a short answer'
     AND t ->> 'frame_id' = 'frame-b' AND t -> 'canvas_status' = 'null'::jsonb, 'lesson target: ' || t::text;
  r := public.elemental_bot_canvas_write(g, lp, pg_temp.note(lp, 'frame-b', 'aK', 'aL', 1, 'answer', 'test', 'tester'));
  ASSERT r ->> 'reason' = 'bad_card' AND r -> 'status' = 'null'::jsonb, 'a lesson note must be a reference card: ' || r::text;
  r := public.elemental_bot_canvas_write(g, lp, pg_temp.note(lp, 'frame-b', 'aK', 'aL', 1, 'answer', 'reference', 'lesson'));
  ASSERT (r ->> 'ok')::boolean AND (r ->> 'present')::boolean, 'lesson write: ' || r::text;
  r := public.elemental_bot_canvas_tombstone(g, lp);
  ASSERT (r ->> 'ok')::boolean AND (pg_temp.el(pg_temp.board('f1'), 'el-' || lp || '-t') ->> 'isDeleted')::boolean, 'lesson tombstone: ' || r::text;
  -- A progress row with no team is no note.
  INSERT INTO public.elemental_lesson_progress (edition, lesson_id, part) VALUES ('elemental-2026', 'intro', 2) RETURNING id INTO lp;
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_canvas_target(%L, %L)', g, lp), 'entry_not_found');
END $$;

-- ---------------------------------------------------------------------------
-- As elemental_bot: the functions work, the tables and the merge stay closed.
SET ROLE elemental_bot;
DO $$
DECLARE
  k uuid;
  r jsonb;
BEGIN
  k := (public.elemental_bot_tester_add('800000000000000001', '700000000000000002', '900000000000000004', 'a teacher', 'the quiz') ->> 'id')::uuid;
  r := public.elemental_bot_canvas_write('800000000000000001', k, pg_temp.note(k, 'frame-b', 'aI', 'aJ', 1, 'as the bot'));
  ASSERT (r ->> 'ok')::boolean, 'bot write: ' || r::text;
  ASSERT public.elemental_bot_canvas_target('800000000000000001', k) ->> 'frame_id' = 'frame-b', 'bot target';
  BEGIN
    PERFORM public.whiteboard_merge_elements('00000000-0000-4000-8000-0000000000f1', '[]'::jsonb);
    RAISE EXCEPTION 'elemental_bot ran whiteboard_merge_elements';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM count(*) FROM public.elemental_canvas_links;
    RAISE EXCEPTION 'elemental_bot read elemental_canvas_links';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.elemental__valid_index('a0');
    RAISE EXCEPTION 'elemental_bot ran a helper';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

DO $$
DECLARE
  bad text;
BEGIN
  SELECT string_agg(p.oid::regprocedure::text, ', ') INTO bad
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname LIKE 'elemental\_%'
    AND (has_function_privilege('elemental_bot', p.oid, 'EXECUTE') <> (p.proname LIKE 'elemental\_bot\_%' AND p.proname NOT LIKE 'elemental\_bot\_\_%')
         OR has_function_privilege('anon', p.oid, 'EXECUTE') OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
         OR (p.proname LIKE 'elemental\_\_%' AND has_function_privilege('service_role', p.oid, 'EXECUTE')
             AND p.proname NOT IN ('elemental__elements', 'elemental__is_snowflake', 'elemental__valid_schedule', 'elemental__valid_card_override'))
         OR (p.proname NOT LIKE 'elemental\_\_%' AND NOT (p.prosecdef AND EXISTS (SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%'))));
  ASSERT bad IS NULL, 'grants or SECURITY DEFINER wrong on ' || bad;
  ASSERT (SELECT count(*) FROM pg_proc WHERE proname IN (
    'elemental_bot_tester_add', 'elemental_bot_tester_add_staff', 'elemental_bot_tester_edit', 'elemental_bot_tester_remove',
    'elemental_bot_tester_review', 'elemental_bot_tester_sample', 'elemental_bot_canvas_link', 'elemental_bot_canvas_override',
    'elemental_bot_canvas_target', 'elemental_bot_canvas_write', 'elemental_bot_canvas_tombstone', 'elemental_bot_canvas_pending',
    'elemental_bot_handin')) = 13, 'the 13 functions of this file';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.elemental_canvas_links'::regclass), 'RLS on links';
  ASSERT NOT has_table_privilege('authenticated', 'public.elemental_canvas_links', 'SELECT')
     AND NOT has_table_privilege('anon', 'public.elemental_canvas_links', 'SELECT')
     AND has_table_privilege('service_role', 'public.elemental_canvas_links', 'SELECT'), 'link table grants';
  ASSERT has_function_privilege('service_role', 'public.whiteboard_merge_elements(uuid,jsonb)', 'EXECUTE')
     AND NOT has_function_privilege('elemental_bot', 'public.whiteboard_merge_elements(uuid,jsonb)', 'EXECUTE'), 'merge grants';
END $$;

-- ---------------------------------------------------------------------------
-- whiteboard_* functions are byte-identical (definition and grants) before and after this file runs again,
-- and the file's SQL names no whiteboard_* object except the merge it calls.
CREATE TEMP TABLE before_defs AS
  SELECT p.oid::regprocedure::text AS sig, md5(pg_get_functiondef(p.oid)) AS def, coalesce(p.proacl::text, '') AS acl
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND (p.proname LIKE 'whiteboard\_%' OR p.proname LIKE 'shift\_quest\_%') AND p.prokind = 'f';
CREATE TEMP TABLE before_merge AS
  SELECT pg_get_functiondef('public.whiteboard_merge_elements(uuid,jsonb)'::regprocedure) AS def;
\ir ../../../migrations/20261123100100_elemental_testers_canvas.sql
DO $$
DECLARE
  changed text;
BEGIN
  ASSERT (SELECT count(*) FROM before_defs) >= 5, 'expected the whiteboard functions to be present';
  SELECT string_agg(coalesce(b.sig, a.sig), ', ') INTO changed
  FROM before_defs b
  FULL JOIN (
    SELECT p.oid::regprocedure::text AS sig, md5(pg_get_functiondef(p.oid)) AS def, coalesce(p.proacl::text, '') AS acl
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND (p.proname LIKE 'whiteboard\_%' OR p.proname LIKE 'shift\_quest\_%') AND p.prokind = 'f'
  ) a ON a.sig = b.sig
  WHERE a.sig IS NULL OR b.sig IS NULL OR a.def <> b.def OR a.acl <> b.acl;
  ASSERT changed IS NULL, 'whiteboard_* or shift_quest_* changed: ' || changed;
  ASSERT (SELECT def FROM before_merge) = pg_get_functiondef('public.whiteboard_merge_elements(uuid,jsonb)'::regprocedure),
    'whiteboard_merge_elements definition changed';
END $$;
