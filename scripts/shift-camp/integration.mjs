import pg from "pg";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const url = process.env.SHIFT_TEST_DATABASE_URL;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname))
  throw new Error(
    "Set SHIFT_TEST_DATABASE_URL to the isolated local test database",
  );
const client = new pg.Client({ connectionString: url });
await client.connect();
// This runner requires an EMPTY disposable database, never a project database.
assert.equal(
  (
    await client.query(
      "select count(*) from information_schema.tables where table_schema='public'",
    )
  ).rows[0].count,
  "0",
  "Use an empty disposable database",
);
await client.query(
  await fs.readFile(new URL("./fixture.sql", import.meta.url), "utf8"),
);
const migration = await fs.readFile(
  new URL(
    "../../supabase/migrations/20260930180202_interactive_shift_camp.sql",
    import.meta.url,
  ),
  "utf8",
);
await client.query(migration);
await client.query(migration); // Rerunning an additive migration must be safe.

const ids = Array.from(
  { length: 7 },
  (_, i) => `00000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`,
);
for (const [i, id] of ids.entries()) {
  await client.query("insert into auth.users values($1)", [id]);
  await client.query("insert into profiles(id,full_name) values($1,$2)", [
    id,
    `Synthetic ${i}`,
  ]);
}
await client.query("insert into user_roles values($1,'admin')", [ids[0]]);
async function as(id, role = "authenticated") {
  await client.query(`set role ${role}`);
  await client.query("select set_config('request.jwt.claim.sub',$1,false)", [
    id ?? "",
  ]);
}
async function call(action, cid = null, payload = {}) {
  return (
    await client.query("select public.shift_camp_action($1,$2,$3) result", [
      action,
      cid,
      payload,
    ])
  ).rows[0].result;
}
async function fails(fn, pattern) {
  await assert.rejects(fn, pattern);
}
await as(ids[0]);
const tomorrow = (
  await client.query(
    "select ((now() at time zone 'Asia/Bangkok')::date+2)::text as day",
  )
).rows[0].day;
let s = await call("create_cohort", null, {
  name: "Synthetic SHIFT",
  starts_on: tomorrow,
});
const cid = s.cohort.id;
assert.equal(s.nodes.length, 7);
for (const id of ids.slice(1, 6))
  s = await call("enroll", cid, { user_id: id });
await call("enroll", cid, { user_id: ids[5], role: "mentor" }); // Explicit admin role assignment.
await as(ids[1]);
await call("introduction", cid, {
  language: "th",
  availability: "evenings",
  idea: "",
  finished: true,
});
s = await call("create_group", cid, { name: "First group" });
const gid = s.groups[0].id;
await fails(
  () =>
    client.query(
      "insert into classroom_teams(classroom_id,name,created_by,max_members) values($1,'Bypass',$2,99)",
      [s.cohort.classroom_id, ids[1]],
    ),
  /row-level security/,
);
await fails(
  () =>
    client.query(
      "insert into classroom_memberships(classroom_id,user_id,role) values($1,$2,'instructor')",
      [s.cohort.classroom_id, ids[6]],
    ),
  /row-level security/,
);
for (const id of ids.slice(2, 5))
  await call("invite", cid, { kind: "group", target_id: gid, invitee: id });
for (const id of ids.slice(2, 4)) {
  await as(id);
  s = await call("snapshot", cid);
  await call("answer_invite", cid, {
    id: s.invitations.find((i) => i.invitee === id).id,
    accept: true,
  });
}
await as(ids[4]);
s = await call("snapshot", cid);
await fails(
  () =>
    call("answer_invite", cid, {
      id: s.invitations.find((i) => i.invitee === ids[4]).id,
      accept: true,
    }),
  /full/,
);
await as(ids[1]);
s = await call("create_project", cid, { title: "A shared project" });
const pid = s.projects[0].id;
await fails(
  () => call("create_project", cid, { title: "Duplicate" }),
  /one active project/,
);
await call("invite", cid, { kind: "project", target_id: pid, invitee: ids[2] });
await as(ids[2]);
s = await call("snapshot", cid);
await call("answer_invite", cid, {
  id: s.invitations.find((i) => i.kind === "project").id,
  accept: true,
});
await as(ids[3]);
s = await call("create_project", cid, { title: "Solo project" });
assert.equal(s.projects.length, 2);
await fails(
  () =>
    call("save_update", cid, {
      day: 1,
      body: { shipped: "Too early" },
      publish: true,
    }),
  /has started/,
);
await as(ids[6]);
await fails(() => call("snapshot", cid), /Not enrolled/);
assert.equal(
  (await client.query("select count(*) from classroom_memberships")).rows[0]
    .count,
  "0",
  "Camp classroom membership is private across cohorts",
);
assert.equal(
  (await client.query("select count(*) from community_projects")).rows[0].count,
  "0",
);
await fails(() => call("enroll", cid, { user_id: ids[6] }), /Not enrolled/);
await as(null, "anon");
assert.equal(
  (await client.query("select count(*) from community_projects")).rows[0].count,
  "0",
);
// Preserve public non-camp reads.
await client.query("reset role");
await client.query("insert into communities(name) values('Public unrelated')");
await as(null, "anon");
assert.equal(
  (await client.query("select count(*) from communities")).rows[0].count,
  "1",
);
await client.query("reset role");
await client.query(
  "update shift_camp_cohorts set starts_on=(now() at time zone 'Asia/Bangkok')::date-6 where id=$1",
  [cid],
);
await as(ids[1]);
s = await call("save_update", cid, {
  day: 1,
  body: { shipped: "Working prototype", broke: "Button", learned: "Ask users" },
  publish: false,
});
let u = s.updates[0];
assert.equal(u.published_at, null);
const draftPath = `${cid}/${pid}/draft.png`;
await client.query(
  "insert into storage.objects(bucket_id,name) values('shift-camp',$1)",
  [draftPath],
);
assert.equal(
  (
    await client.query("select count(*) from storage.objects where name=$1", [
      draftPath,
    ])
  ).rows[0].count,
  "1",
  "Project member can read draft image",
);
await as(ids[3]);
assert.equal(
  (
    await client.query("select count(*) from storage.objects where name=$1", [
      draftPath,
    ])
  ).rows[0].count,
  "0",
  "Same-cohort peer cannot read unpublished image",
);
assert.equal(
  (await call("snapshot", cid)).updates.length,
  0,
  "Draft hidden from other project",
);
await as(ids[2]);
s = await call("save_update", cid, {
  day: 1,
  revision: u.revision,
  body: {
    shipped: "Working prototype",
    learned: "Test early",
    screenshots: [draftPath],
  },
  publish: true,
});
u = s.updates[0];
assert.ok(u.published_at);
assert.equal(u.contributor_ids.length, 1);
await fails(
  () =>
    call("save_update", cid, {
      day: 1,
      revision: 1,
      body: { shipped: "Stale edit" },
      publish: true,
    }),
  /changed/,
);
await as(ids[3]);
assert.equal(
  (
    await client.query("select count(*) from storage.objects where name=$1", [
      draftPath,
    ])
  ).rows[0].count,
  "1",
  "Cohort peer can read image referenced in a published update",
);
await call("comment", cid, {
  update_id: u.id,
  body: "I tried it. The button worked.",
});
await call("message", cid, { body: "What shall we test next?" });
await call("checkin", cid, { day: 7, choice: 4, capability: 3, support: 5 });
await call("request", cid, {
  kind: "help",
  body: "Could someone review my scope?",
});
await call("request", cid, {
  kind: "report",
  update_id: u.id,
  body: "Please review this post",
});
await fails(
  () =>
    call("checkpoint", cid, {
      project_id: pid,
      day: 1,
      feedback: "Unauthorized",
    }),
  /Staff/,
);
await fails(
  () =>
    client
      .query(
        "update community_posts set content='Unauthorized' where id=$1 returning id",
        [u.post_id],
      )
      .then((r) => assert.equal(r.rowCount, 1)),
  /0 !== 1/,
);
await as(ids[1]);
s = await call("snapshot", cid);
assert.equal(s.checkins.length, 0, "Individual check-ins private");
assert.equal(s.requests.length, 0, "Help reports private");
await call("complete_milestone", cid, { node_id: s.nodes[0].id });
await as(ids[2]);
s = await call("snapshot", cid);
assert.equal(
  s.progress.length,
  0,
  "Shared update does not complete peer progress",
);
await call("save_update", cid, {
  day: 7,
  body: {
    shipped: "Final demo",
    problem: "A real problem",
    learned: "Changed our approach",
    evidence: "Observed tests",
  },
  publish: true,
});
await as(ids[0]);
s = await call("snapshot", cid);
assert.equal(s.checkins.length, 1);
await call("checkpoint", cid, {
  project_id: pid,
  day: 1,
  feedback: "Narrow the first test",
});
await call("resolve_request", cid, {
  id: s.requests[0].id,
  resolution: "Reviewed with participant",
});
await call("moderate", cid, { id: u.id, hidden: true });
await as(ids[3]);
s = await call("snapshot", cid);
assert.ok(!s.updates.find((x) => x.id === u.id));
await as(ids[0]);
await call("assign_group", cid, { group_id: gid, user_id: ids[1] });
s = await call("snapshot", cid);
assert.ok(
  s.projects.find((p) => p.id === pid).members.includes(ids[1]),
  "Group placement preserves contributions",
);
// Two groups in another cohort establish cross-cohort checks and a real race.
await as(ids[0]);
const raceCamp = await call("create_cohort", null, {
  name: "Race cohort",
  starts_on: tomorrow,
});
const raceId = raceCamp.cohort.id;
for (const id of ids.slice(1, 5)) await call("enroll", raceId, { user_id: id });
await as(ids[1]);
const raceGroup = (await call("create_group", raceId, { name: "Race group" }))
  .groups[0].id;
for (const id of ids.slice(2, 5))
  await call("invite", raceId, {
    kind: "group",
    target_id: raceGroup,
    invitee: id,
  });
const invitations = (await call("snapshot", raceId)).invitations;
const racers = await Promise.all(
  ids.slice(2, 5).map(async (id) => {
    const db = new pg.Client({ connectionString: url });
    await db.connect();
    await db.query("set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    try {
      await db.query("select public.shift_camp_action($1,$2,$3)", [
        "answer_invite",
        raceId,
        { id: invitations.find((i) => i.invitee === id).id, accept: true },
      ]);
      return true;
    } catch (e) {
      assert.match(e.message, /full/);
      return false;
    } finally {
      await db.end();
    }
  }),
);
assert.equal(
  racers.filter(Boolean).length,
  2,
  "Concurrent acceptance enforces maximum three",
);
await as(ids[0]);
await call("enroll", raceId, { user_id: ids[6], role: "mentor" });
await as(ids[6]);
await fails(() => call("snapshot", cid), /Not enrolled/);
await fails(
  () =>
    call("checkpoint", cid, {
      project_id: pid,
      day: 1,
      feedback: "Wrong cohort",
    }),
  /Not enrolled/,
);
await as(ids[3]);
assert.equal(
  (
    await client.query("select count(*) from community_posts where id=$1", [
      u.post_id,
    ])
  ).rows[0].count,
  "0",
  "Moderation applies to legacy reads",
);
assert.equal(
  (
    await client.query("select count(*) from post_comments where post_id=$1", [
      u.post_id,
    ])
  ).rows[0].count,
  "0",
  "Hidden post comments protected",
);
await as(ids[1]);
const path = `${cid}/${pid}/synthetic.png`;
await client.query(
  "insert into storage.objects(bucket_id,name) values('shift-camp',$1)",
  [path],
);
await as(ids[6]);
assert.equal(
  (await client.query("select count(*) from storage.objects")).rows[0].count,
  "0",
  "Images are private across cohorts",
);
await fails(
  () =>
    client.query(
      "insert into storage.objects(bucket_id,name) values('shift-camp',$1)",
      [path],
    ),
  /row-level security/,
);
await as(ids[1]);
await fails(
  () =>
    call("save_update", cid, {
      day: 2,
      body: {
        shipped: "Wrong path",
        screenshots: [`${raceId}/${pid}/bad.png`],
      },
      publish: true,
    }),
  /this project/,
);
await as(ids[6]);
const mentorState = await call("snapshot", raceId);
assert.equal(mentorState.is_staff, true);
await as(ids[5]);
assert.equal(
  (await call("snapshot", cid)).checkins.length,
  1,
  "Assigned mentor can see check-ins",
);
await as(ids[0]);
let moderation = await call("snapshot", cid);
const commentId = moderation.comments[0].id;
const messageId = moderation.messages[0].id;
await call("moderate_comment", cid, { id: commentId, hidden: true });
await call("moderate_message", cid, { id: messageId, hidden: true });
await as(ids[3]);
assert.equal(
  (await call("snapshot", cid)).messages.length,
  0,
  "Hidden group message filtered",
);
await as(ids[0]);
await call("moderate", cid, { id: u.id, hidden: false });
await as(ids[3]);
assert.equal(
  (await call("snapshot", cid)).comments.length,
  0,
  "Hidden comment filtered independently",
);
await fails(
  () => call("moderate_message", cid, { id: messageId, hidden: false }),
  /Staff/,
);
await as(ids[1]);
await fails(
  () =>
    call("save_update", cid, {
      day: 2,
      body: { shipped: "Invalid credit" },
      contributors: [ids[6]],
      publish: true,
    }),
  /contributors/,
);
await call("save_update", cid, {
  day: 2,
  body: { shipped: "Both contributed" },
  contributors: [ids[1], ids[2]],
  publish: true,
});
await client.end();
console.log(
  "PASS: transactional camp flows, privacy, legacy isolation, drafts, revision conflicts, solo/shared ownership, feedback, check-ins, and staff actions",
);
