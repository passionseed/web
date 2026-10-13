/**
 * @jest-environment node
 */
import {
  DEADLINE_MS,
  FLAG_KEY,
  MAX_AUDIO_BYTES,
  handleTranscribe,
  type TranscribeDeps,
  type WhisperFn,
} from "@/lib/shift-round/transcribe/handler";

const ROUND = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";
const DRAFT = "44444444-4444-4444-8444-444444444444";
const PATH = `${ROUND}/${USER}/${DRAFT}/audio.m4a`;
const SECRET_TRANSCRIPT = "คุณแม่บอกว่าแอปช้าเกินไป SECRET-TRANSCRIPT";

type FakeOpts = {
  user?: { id: string } | null;
  flag?: unknown;
  flagError?: boolean;
  check?: { data?: unknown; error?: unknown };
  audio?: Blob | null;
};

function fakeClient(opts: FakeOpts = {}) {
  const calls = { rpc: [] as unknown[], download: [] as string[], flagKey: "" };
  const client = {
    auth: {
      getUser: jest.fn(async () =>
        opts.user === null
          ? { data: { user: null }, error: { message: "jwt expired" } }
          : { data: { user: opts.user ?? { id: USER } }, error: null }
      ),
    },
    from: jest.fn(() => ({
      select: () => ({
        eq: (_col: string, key: string) => {
          calls.flagKey = key;
          return {
            maybeSingle: async () =>
              opts.flagError
                ? { data: null, error: { message: "boom" } }
                : opts.flag === undefined
                  ? { data: null, error: null }
                  : { data: { value: opts.flag }, error: null },
          };
        },
      }),
    })),
    rpc: jest.fn(async (name: string, args: unknown) => {
      calls.rpc.push([name, args]);
      return opts.check ?? { data: { ok: true, data: { max_seconds: 180, language_hint: "th" } }, error: null };
    }),
    storage: {
      from: jest.fn(() => ({
        download: async (path: string) => {
          calls.download.push(path);
          return opts.audio === null
            ? { data: null, error: { message: "not found" } }
            : { data: opts.audio ?? new Blob([new Uint8Array(2048)], { type: "audio/mp4" }), error: null };
        },
      })),
    },
  };
  return { client, calls };
}

const whisperOk: WhisperFn = async () => ({
  text: ` ${SECRET_TRANSCRIPT} `,
  language: "thai",
  duration: 42.5,
  segments: [
    { id: 0, start: 0, end: 2.345, text: " คุณแม่บอกว่า" },
    { id: 1, start: 2.345, end: 5.1, text: "แอปช้าเกินไป SECRET-TRANSCRIPT " },
  ],
});

function deps(opts: FakeOpts = {}, whisper: WhisperFn | null = whisperOk, extra: Partial<TranscribeDeps> = {}) {
  const fake = fakeClient({ flag: true, ...opts });
  const log = jest.fn();
  const createUserClient = jest.fn(() => fake.client as never);
  return { d: { createUserClient, whisper, log, ...extra } as TranscribeDeps, fake, log, createUserClient };
}

const req = (body: unknown = { path: PATH, lang: "th" }, authorization: string | null = "Bearer student-jwt") => ({
  authorization,
  body,
});

describe("handleTranscribe", () => {
  it("401 without a bearer token, before any client is created", async () => {
    const { d, createUserClient } = deps();
    const res = await handleTranscribe(req(undefined, null), d);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: { code: "unauthenticated", category: "unauthenticated", retry_after: null } });
    expect(createUserClient).not.toHaveBeenCalled();
    expect((await handleTranscribe(req(undefined, "Basic abc"), d)).status).toBe(401);
  });

  it("401 when the token does not resolve to a user", async () => {
    const { d } = deps({ user: null });
    expect((await handleTranscribe(req(), d)).status).toBe(401);
  });

  it("uses the student's own token for the client", async () => {
    const { d, createUserClient, fake } = deps();
    await handleTranscribe(req(), d);
    expect(createUserClient).toHaveBeenCalledWith("student-jwt");
    expect(fake.client.auth.getUser).toHaveBeenCalledWith("student-jwt");
  });

  it("400 for a path that is not a round audio object", async () => {
    const { d } = deps();
    for (const path of ["../etc/passwd", `${ROUND}/${USER}/${DRAFT}/photo.jpg`, 42]) {
      expect((await handleTranscribe(req({ path }), d)).status).toBe(400);
    }
  });

  it("403 media_not_owned when folder 2 is another user, without calling the RPC", async () => {
    const { d, fake } = deps();
    const res = await handleTranscribe(req({ path: `${ROUND}/${OTHER}/${DRAFT}/audio.m4a` }), d);
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: { code: "media_not_owned" } });
    expect(fake.calls.rpc).toHaveLength(0);
  });

  it.each([
    ["flag false", { flag: false }],
    ["flag missing (defaults OFF)", { flag: undefined }],
    ["flag unreadable", { flagError: true }],
    ["flag not a strict boolean", { flag: "true" }],
  ])("503 transcription_paused when %s, and Groq is never called", async (_label, opts) => {
    const whisper = jest.fn(whisperOk);
    const { d, fake } = deps(opts as FakeOpts, whisper);
    const res = await handleTranscribe(req(), d);
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ error: { code: "transcription_paused" } });
    expect(fake.calls.flagKey).toBe(FLAG_KEY);
    expect(whisper).not.toHaveBeenCalled();
    expect(fake.calls.download).toHaveLength(0);
  });

  it("503 transcription_paused when GROQ_API_KEY is not configured", async () => {
    const { d } = deps({}, null);
    expect((await handleTranscribe(req(), d)).status).toBe(503);
  });

  it("calls shift_round_transcription_check with p_path", async () => {
    const { d, fake } = deps();
    await handleTranscribe(req(), d);
    expect(fake.calls.rpc).toEqual([["shift_round_transcription_check", { p_path: PATH }]]);
  });

  it.each([
    ["transcription_paused", 503, "unavailable"],
    ["media_not_owned", 403, "forbidden"],
    ["round_finished", 409, "validation"],
    ["entry_not_found", 404, "validation"],
    ["media_missing", 404, "validation"],
  ])("maps check error %s -> %i", async (code, status, category) => {
    const whisper = jest.fn(whisperOk);
    const { d } = deps({ check: { data: { ok: false, error: { code, category } }, error: null } }, whisper);
    const res = await handleTranscribe(req(), d);
    expect(res.status).toBe(status);
    expect(res.body).toMatchObject({ error: { code, category } });
    expect(whisper).not.toHaveBeenCalled();
  });

  it("maps rate_limited -> 429 with Retry-After", async () => {
    const { d } = deps({ check: { data: { ok: false, error: { code: "rate_limited", retry_after: 1200 } }, error: null } });
    const res = await handleTranscribe(req(), d);
    expect(res.status).toBe(429);
    expect(res.headers?.["Retry-After"]).toBe("1200");
    expect(res.body).toMatchObject({ error: { code: "rate_limited", category: "retryable", retry_after: 1200 } });
  });

  it("maps a missing RPC (PGRST202) to unavailable", async () => {
    const { d } = deps({ check: { data: null, error: { code: "PGRST202", message: "x" } } });
    const res = await handleTranscribe(req(), d);
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ error: { code: "unavailable" } });
  });

  it("404 media_missing when the object cannot be downloaded", async () => {
    const { d } = deps({ audio: null });
    expect((await handleTranscribe(req(), d)).body).toMatchObject({ error: { code: "media_missing" } });
  });

  it("413 audio_too_long above 5 MB, without calling Groq", async () => {
    const whisper = jest.fn(whisperOk);
    const { d } = deps({ audio: new Blob([new Uint8Array(MAX_AUDIO_BYTES + 1)]) }, whisper);
    const res = await handleTranscribe(req(), d);
    expect(res.status).toBe(413);
    expect(res.body).toMatchObject({ error: { code: "audio_too_long" } });
    expect(whisper).not.toHaveBeenCalled();
  });

  it("returns {text, segments(ms), language} on success", async () => {
    const whisper = jest.fn(whisperOk);
    const { d } = deps({}, whisper);
    const res = await handleTranscribe(req({ path: PATH, lang: "th" }), d);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      text: SECRET_TRANSCRIPT,
      language: "th",
      segments: [
        { id: 0, start_ms: 0, end_ms: 2345, text: "คุณแม่บอกว่า" },
        { id: 1, start_ms: 2345, end_ms: 5100, text: "แอปช้าเกินไป SECRET-TRANSCRIPT" },
      ],
    });
    const call = whisper.mock.calls[0][0];
    expect(call.language).toBe("th");
    expect(call.file.name).toBe("audio.m4a");
  });

  it("422 audio_too_long when the provider reports > max_seconds", async () => {
    const { d } = deps({}, async () => ({ text: "x", duration: 400, segments: [] }));
    expect((await handleTranscribe(req(), d)).status).toBe(422);
  });

  it("Groq failure -> 502 transcription_failed", async () => {
    const { d } = deps({}, async () => {
      throw new Error(`provider exploded while reading ${SECRET_TRANSCRIPT}`);
    });
    const res = await handleTranscribe(req(), d);
    expect(res.status).toBe(502);
    expect(res.body).toMatchObject({ error: { code: "transcription_failed", category: "retryable" } });
  });

  it("timeout -> 504 transcription_failed and the request is aborted", async () => {
    let aborted = false;
    const hang: WhisperFn = ({ signal }) =>
      new Promise((_, reject) => {
        signal.addEventListener("abort", () => {
          aborted = true;
          reject(new Error("aborted"));
        });
      });
    const { d } = deps({}, hang, { deadlineMs: 20 });
    const res = await handleTranscribe(req(), d);
    expect(res.status).toBe(504);
    expect(res.body).toMatchObject({ error: { code: "transcription_failed" } });
    expect(aborted).toBe(true);
    expect(DEADLINE_MS).toBe(25_000);
  });

  it("never logs transcript text, audio, paths or tokens", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) =>
      jest.spyOn(console, m).mockImplementation(() => {})
    );
    const seen: string[] = [];
    const log = jest.fn((event: string, fields: Record<string, unknown>) => seen.push(JSON.stringify([event, fields])));
    for (const whisper of [whisperOk, async () => { throw new Error(SECRET_TRANSCRIPT); }] as WhisperFn[]) {
      const { d } = deps({}, whisper, { log });
      await handleTranscribe(req(), d);
    }
    const { d } = deps({ check: { data: { ok: false, error: { code: "rate_limited", retry_after: 5 } }, error: null } }, whisperOk, { log });
    await handleTranscribe(req(), d);

    const consoleOut = spies.flatMap((s) => s.mock.calls.map((c) => JSON.stringify(c)));
    for (const line of [...seen, ...consoleOut]) {
      expect(line).not.toContain("SECRET-TRANSCRIPT");
      expect(line).not.toContain("คุณแม่");
      expect(line).not.toContain(USER);
      expect(line).not.toContain("student-jwt");
    }
    expect(seen.length).toBeGreaterThan(0);
    spies.forEach((s) => s.mockRestore());
  });
});

describe("POST /api/shift/transcribe route wiring", () => {
  const OLD_ENV = process.env;
  afterEach(() => {
    process.env = OLD_ENV;
    jest.resetModules();
    jest.dontMock("@supabase/supabase-js");
  });

  it("builds the Supabase client with the anon key and the student's bearer, never the service role", async () => {
    process.env = {
      ...OLD_ENV,
      NEXT_PUBLIC_SUPABASE_URL: "https://proj.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      GROQ_API_KEY: "",
    };
    const fake = fakeClient({ flag: false });
    const createClient = jest.fn(() => fake.client);
    jest.resetModules();
    jest.doMock("@supabase/supabase-js", () => ({ createClient }));
    const { POST } = await import("../transcribe/route");
    const res = await POST(
      new Request("https://www.passionseed.org/api/shift/transcribe", {
        method: "POST",
        headers: { Authorization: "Bearer student-jwt", "Content-Type": "application/json" },
        body: JSON.stringify({ path: PATH, lang: "th" }),
      })
    );
    expect(res.status).toBe(503); // flag off
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(createClient).toHaveBeenCalledTimes(1);
    const [url, key, options] = createClient.mock.calls[0] as unknown as [string, string, { global: { headers: Record<string, string> } }];
    expect(url).toBe("https://proj.supabase.co");
    expect(key).toBe("anon-key");
    expect(key).not.toBe("service-role-key");
    expect(options.global.headers.Authorization).toBe("Bearer student-jwt");
  });

  it("401 without bearer through the route", async () => {
    const { POST } = await import("../transcribe/route");
    const res = await POST(new Request("https://x.test/api/shift/transcribe", { method: "POST", body: "{}" }));
    expect(res.status).toBe(401);
  });
});
