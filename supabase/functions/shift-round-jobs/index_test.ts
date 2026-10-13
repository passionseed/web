// deno test supabase/functions/shift-round-jobs/
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { type Deps, handle } from "./index.ts";
import { PUSH_COPY, renderPush, stripExif } from "./lib.ts";

const SECRET = "test-secret-0123456789";

type RpcHandler = (args: Record<string, unknown>) => unknown;

function fakeDb(rpcs: Record<string, RpcHandler>, opts: {
  config?: Record<string, unknown>;
  storage?: Map<string, Uint8Array>;
} = {}) {
  const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const storage = opts.storage ?? new Map<string, Uint8Array>();
  const removed: string[] = [];
  const db = {
    calls,
    removed,
    rpc(fn: string, args: Record<string, unknown> = {}) {
      calls.push({ fn, args });
      const h = rpcs[fn];
      const data = h ? h(args) : {};
      return Promise.resolve({ data: { ok: true, data }, error: null });
    },
    from(_table: string) {
      let key = "";
      const q = {
        select: () => q,
        eq: (_c: string, v: string) => {
          key = v;
          return q;
        },
        maybeSingle: () =>
          Promise.resolve({ data: key in (opts.config ?? {}) ? { value: opts.config![key] } : null, error: null }),
      };
      return q;
    },
    storage: {
      from: (_b: string) => ({
        list: (folder: string) => {
          const prefix = folder + "/";
          const names = new Map<string, boolean>();
          for (const k of storage.keys()) {
            if (!k.startsWith(prefix)) continue;
            const rest = k.slice(prefix.length);
            const [head, ...tail] = rest.split("/");
            names.set(head, tail.length > 0);
          }
          return Promise.resolve({
            data: [...names].map(([name, isFolder]) => ({ name, id: isFolder ? null : name })),
            error: null,
          });
        },
        remove: (paths: string[]) => {
          for (const p of paths) {
            storage.delete(p);
            removed.push(p);
          }
          return Promise.resolve({ data: [], error: null });
        },
        download: (p: string) => Promise.resolve({ data: new Blob([storage.get(p) ?? new Uint8Array()]), error: null }),
        upload: (p: string, bytes: Uint8Array) => {
          storage.set(p, bytes);
          return Promise.resolve({ data: {}, error: null });
        },
      }),
    },
  };
  return db;
}

function deps(db: ReturnType<typeof fakeDb> | null, fetcher: (url: string, init?: RequestInit) => Response, env: Record<string, string> = {}) {
  let made = 0;
  const fetches: Array<{ url: string; body?: string }> = [];
  const d: Deps & { made: () => number; fetches: typeof fetches } = {
    env: (n) => ({ SHIFT_ROUND_JOBS_SECRET: SECRET, SUPABASE_URL: "http://x", SUPABASE_SERVICE_ROLE_KEY: "k", ...env })[n],
    // deno-lint-ignore no-explicit-any
    makeClient: () => {
      made++;
      return db as any;
    },
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      fetches.push({ url, body: init?.body as string | undefined });
      return Promise.resolve(fetcher(url, init));
    },
    made: () => made,
    fetches,
  };
  return d;
}

const req = (job: string, secret: string | null = SECRET) =>
  new Request("http://fn/shift-round-jobs", {
    method: "POST",
    headers: secret === null ? {} : { "x-shift-round-jobs-secret": secret },
    body: JSON.stringify({ job }),
  });

const baseRpcs: Record<string, RpcHandler> = {
  shift_round_job_start: () => ({ run_id: "run-1", last_ok_at: null }),
  shift_round_job_finish: () => ({}),
};

Deno.test("missing or wrong secret -> 401 before any client is created", async () => {
  for (const secret of [null, "nope", SECRET + "x"]) {
    const d = deps(fakeDb(baseRpcs), () => new Response("{}"));
    const res = await handle(req("issue", secret), d);
    assertEquals(res.status, 401);
    assertEquals(d.made(), 0);
  }
});

Deno.test("unset secret env refuses everything", async () => {
  const d = deps(fakeDb(baseRpcs), () => new Response("{}"), { SHIFT_ROUND_JOBS_SECRET: "" });
  assertEquals((await handle(req("issue", ""), d)).status, 401);
});

Deno.test("health gate blocks issuance and alerts", async () => {
  const db = fakeDb(baseRpcs, { config: { "shift_round.issuance_enabled": true } });
  const d = deps(db, (url) => url.includes("cert-health") ? new Response("{}", { status: 503 }) : new Response("{}"),
    { SHIFT_ROUND_ALERT_WEBHOOK_URL: "https://discord.test/hook" });
  const res = await handle(req("issue"), d);
  assertEquals(res.status, 500);
  assert(!db.calls.some((c) => c.fn === "shift_round_job_due_entries"), "no due-entries call");
  assertEquals(db.calls.find((c) => c.fn === "shift_round_job_finish")?.args.p_status, "failed");
  assert(d.fetches.some((f) => f.url === "https://discord.test/hook"), "alert posted");
});

Deno.test("issuance paused flag finishes ok with details.paused", async () => {
  const db = fakeDb(baseRpcs, { config: { "shift_round.issuance_enabled": false } });
  const res = await handle(req("issue"), deps(db, () => new Response("{}")));
  assertEquals(res.status, 200);
  assertEquals((db.calls.find((c) => c.fn === "shift_round_job_finish")?.args.p_details as { paused: boolean }).paused, true);
});

Deno.test("issue loop continues past a failing entry", async () => {
  const db = fakeDb({
    ...baseRpcs,
    shift_round_job_due_entries: () => ({ entry_ids: ["a", "b", "c"] }),
    shift_round_job_issue_entry: (args) => {
      if (args.p_entry_id === "b") throw new Error("boom");
      return { result: "issued" };
    },
  });
  const d = deps(db, (url) => url.includes("cert-health") ? new Response(JSON.stringify({ ok: true })) : new Response("{}"));
  const res = await handle(req("issue"), d);
  const body = await res.json();
  assertEquals(body.details.issued, 2);
  assertEquals(body.details.errors.length, 1);
});

Deno.test("pushes are chunked by 100; DeviceNotRegistered clears token", async () => {
  const candidates = Array.from({ length: 250 }, (_, i) => ({
    ledger_id: `l${i}`, user_id: `u${i}`, token: `ExponentPushToken[${i}]`, lang: i % 2 ? "en" : "th", kind: "evidence_rejected",
    params: { copy_key: "push.rejected", type: "interview", url: `passion-seed://round/evidence/${i}` },
  }));
  const db = fakeDb({
    ...baseRpcs,
    shift_round_job_push_candidates: () => ({ candidates }),
    shift_round_job_receipts_pending: () => ({ receipts: [] }),
  });
  const d = deps(db, (url, init) => {
    if (!url.includes("push/send")) return new Response("{}");
    const msgs = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({
      data: msgs.map((m: { to: string }) =>
        m.to === "ExponentPushToken[7]"
          ? { status: "error", message: "gone", details: { error: "DeviceNotRegistered" } }
          : { status: "ok", id: `t-${m.to}` }
      ),
    }));
  });
  const res = await handle(req("pushes"), d);
  assertEquals(res.status, 200);
  const sends = d.fetches.filter((f) => f.url.includes("push/send"));
  assertEquals(sends.map((s) => JSON.parse(s.body!).length), [100, 100, 50]);
  const clear = db.calls.find((c) => c.fn === "shift_round_job_receipt_result");
  assertEquals(clear?.args, { p_ledger_id: "l7", p_status: "DeviceNotRegistered", p_clear_token: true });
  const first = JSON.parse(sends[0].body!)[0];
  assertEquals(first.channelId, "shift");
  assertEquals(first.data.url, "passion-seed://round/evidence/0");
  assertEquals(first.body, "บันทึกสัมภาษณ์ถูกตีกลับ แตะเพื่อดูวิธีแก้");
});

Deno.test("zero processed with due work alerts", async () => {
  const db = fakeDb({
    ...baseRpcs,
    shift_round_job_push_candidates: () => ({ candidates: [{ ledger_id: "l", user_id: "u", token: "t", lang: "th", kind: "no_evidence", params: { copy_key: "push.no_evidence" } }] }),
  });
  const d = deps(db, (url) => url.includes("push/send") ? new Response("{}", { status: 502 }) : new Response("{}"),
    { SHIFT_ROUND_ALERT_WEBHOOK_URL: "https://discord.test/hook" });
  await handle(req("nudges"), d);
  assert(d.fetches.some((f) => f.url === "https://discord.test/hook"));
});

Deno.test("deletion lists prefixes recursively, removes, and requires empty", async () => {
  const storage = new Map<string, Uint8Array>([
    ["r1/u1/d1/photo.jpg", new Uint8Array([1])],
    ["r1/u1/d2/audio.m4a", new Uint8Array([1])],
    ["r1/u2/d3/photo.jpg", new Uint8Array([1])],
  ]);
  const db = fakeDb({
    ...baseRpcs,
    shift_round_job_enqueue_retention: () => ({}),
    shift_round_job_orphans: () => ({ names: [] }),
    shift_round_job_next_deletions: () => ({ requests: [{ id: "req", storage_paths: [], storage_prefixes: ["r1/u1/"], attempts: 0 }] }),
    shift_round_job_finish_deletion: () => ({}),
  }, { storage });
  await handle(req("purge"), deps(db, () => new Response("{}")));
  assertEquals([...storage.keys()], ["r1/u2/d3/photo.jpg"]);
  assertEquals(db.calls.find((c) => c.fn === "shift_round_job_finish_deletion")?.args.p_status, "storage_done");
});

Deno.test("EXIF segment is stripped and re-uploaded by media_scan", async () => {
  const exif = [0xff, 0xe1, 0x00, 0x0a, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x11, 0x22];
  const app0 = [0xff, 0xe0, 0x00, 0x04, 0x01, 0x02];
  const jpeg = new Uint8Array([0xff, 0xd8, ...app0, ...exif, 0xff, 0xda, 0x00, 0x02, 0x99, 0xff, 0xd9]);
  const out = stripExif(jpeg);
  assert(out.found);
  assertEquals([...out.bytes], [0xff, 0xd8, ...app0, 0xff, 0xda, 0x00, 0x02, 0x99, 0xff, 0xd9]);
  assertEquals(stripExif(out.bytes).found, false);

  const storage = new Map([["r/u/d/photo.jpg", jpeg]]);
  const db = fakeDb({
    ...baseRpcs,
    shift_round_job_media_to_scan: () => ({ media: [{ media_id: "m1", path: "r/u/d/photo.jpg", kind: "photo" }] }),
    shift_round_job_media_scanned: () => ({}),
  }, { storage });
  await handle(req("media_scan"), deps(db, () => new Response("{}")));
  assertEquals(stripExif(storage.get("r/u/d/photo.jpg")!).found, false);
  assertEquals(db.calls.find((c) => c.fn === "shift_round_job_media_scanned")?.args, { p_media_id: "m1", p_exif_found: true });
});

Deno.test("copy keys match Appendix C", () => {
  assertEquals(Object.keys(PUSH_COPY).sort(), [
    "push.certificate", "push.closing_tomorrow", "push.no_evidence", "push.no_evidence_last_day", "push.rejected",
    "push.round_published", "push.squad_assigned", "push.summary_approved", "push.summary_rejected",
  ]);
  for (const v of Object.values(PUSH_COPY)) assert(v.th && v.en);
  assertEquals(
    renderPush({ ledger_id: "l", user_id: "u", token: "t", lang: "en", kind: "closing_tomorrow", params: { copy_key: "push.closing_tomorrow", n: 2 } }).body,
    "The round closes tomorrow at 23:59. 2 Missions to go",
  );
});
