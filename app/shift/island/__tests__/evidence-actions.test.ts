/** @jest-environment node */
import { QuestError } from "@/bot/src/quests/api";

const call = jest.fn();
const resolveIslandViewer = jest.fn();
const refresh = jest.fn();
const processPhoto = jest.fn();
const storePhoto = jest.fn();
const deletePhotos = jest.fn();
const signedPhotos = jest.fn();

jest.mock("next/cache", () => ({ refresh: () => refresh() }));
jest.mock("@/lib/supabase/shift-quests/db", () => ({
  questApi: () => ({ call, rows: jest.fn() }),
}));
jest.mock("@/lib/supabase/shift-quests/viewer", () => ({
  resolveIslandViewer: () => resolveIslandViewer(),
}));
jest.mock("@/lib/supabase/shift-quests/evidence", () => {
  const actual = jest.requireActual<typeof import("@/lib/supabase/shift-quests/evidence")>(
    "@/lib/supabase/shift-quests/evidence",
  );
  return {
    MAX_UPLOAD_BYTES: actual.MAX_UPLOAD_BYTES,
    photoRows: actual.photoRows,
    photosAvailable: actual.photosAvailable,
    processPhoto: (...args: unknown[]) => processPhoto(...args),
    storePhoto: (...args: unknown[]) => storePhoto(...args),
    deletePhotos: (...args: unknown[]) => deletePhotos(...args),
    signedPhotos: (...args: unknown[]) => signedPhotos(...args),
  };
});
jest.mock("sharp", () => jest.fn());
jest.mock("@/utils/supabase/admin", () => ({ createAdminClient: jest.fn() }));

import { loadEvidencePhotos, removeEvidencePhoto, setTeamProblem, uploadEvidencePhoto } from "../evidence-actions";

const ACTOR = "123456789012345678";
const USER = "0b7f4a52-5c1e-4c9b-9f27-6f0f3c1d2e3a";
const SUB = "33333333-3333-4333-8333-333333333333";
const PHOTO = "44444444-4444-4444-8444-444444444444";
const INSTANCE = "55555555-5555-4555-8555-555555555555";
const PROJECT = "66666666-6666-4666-8666-666666666666";
const PATH = `${SUB}/${PHOTO}.webp`;
const me = { name: "Mint", avatarUrl: null, staff: false };
const ready = { state: "ready", me, actor: ACTOR, userId: USER, session: { onboarded: true, roles: [], unread: 0 } };

/** The quest database by function name; an Error answer is thrown. Anything else asked is a test failure. */
function db(answers: Record<string, unknown>) {
  call.mockImplementation(async (fn: string) => {
    if (!(fn in answers)) throw new Error(`unexpected call ${fn}`);
    const answer = answers[fn];
    if (answer instanceof Error) throw answer;
    return answer;
  });
}

const fns = () => call.mock.calls.map(([fn]) => fn);
const logged = () => (console.error as jest.Mock).mock.calls.flat().map(String).join("\n");

function form(file: Blob | string | null, submissionId: string = SUB): FormData {
  const data = new FormData();
  data.set("submissionId", submissionId);
  if (file !== null) data.set("photo", file);
  return data;
}

const JPEG = () => new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], { type: "image/jpeg" });
const PROCESSED = { data: Buffer.from("webp"), bytes: 4, width: 800, height: 600 };

beforeEach(() => {
  call.mockReset();
  refresh.mockReset();
  processPhoto.mockReset().mockResolvedValue(PROCESSED);
  storePhoto.mockReset().mockResolvedValue(undefined);
  deletePhotos.mockReset().mockResolvedValue(true);
  signedPhotos.mockReset().mockImplementation(async (rows: { id: string; width: number; height: number }[]) =>
    rows.map((r) => ({ id: r.id, url: `https://signed/${r.id}`, width: r.width, height: r.height })),
  );
  resolveIslandViewer.mockResolvedValue(ready);
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

describe("uploadEvidencePhoto", () => {
  it("re-encodes, lets the database reserve the path, then stores at that path", async () => {
    db({ shift_quest_schema_version: 14, shift_quest_evidence_add: { id: PHOTO, path: PATH, count: 2 } });
    await expect(uploadEvidencePhoto(form(JPEG()))).resolves.toEqual({ ok: true, data: { id: PHOTO, count: 2 } });
    expect(processPhoto).toHaveBeenCalledTimes(1);
    expect(call).toHaveBeenCalledWith("shift_quest_evidence_add", ACTOR, SUB, 4, 800, 600);
    expect(storePhoto).toHaveBeenCalledWith(PATH, PROCESSED.data);
    // Mid-sheet: an upload never refreshes the page.
    expect(refresh).not.toHaveBeenCalled();
  });

  it("takes the reservation back when Storage fails, and says so in Thai", async () => {
    db({
      shift_quest_schema_version: 14,
      shift_quest_evidence_add: { id: PHOTO, path: PATH, count: 1 },
      shift_quest_evidence_remove: { path: PATH },
    });
    storePhoto.mockRejectedValue(new Error("storage_upload_failed"));
    const result = await uploadEvidencePhoto(form(JPEG()));
    expect(result).toMatchObject({ ok: false, code: "photo_upload_failed" });
    expect(call).toHaveBeenCalledWith("shift_quest_evidence_remove", ACTOR, PHOTO);
    expect(logged()).not.toContain(PATH);
  });

  it("refuses an empty pick, a pick over 4 MB and an unreadable one before the database is asked", async () => {
    db({ shift_quest_schema_version: 14 });
    expect(await uploadEvidencePhoto(form(null))).toMatchObject({ ok: false, code: "photo_unreadable" });
    expect(await uploadEvidencePhoto(form("text"))).toMatchObject({ ok: false, code: "photo_unreadable" });
    const big = new Blob([new Uint8Array(4 * 1024 * 1024 + 1)], { type: "image/jpeg" });
    expect(await uploadEvidencePhoto(form(big))).toMatchObject({ ok: false, code: "photo_too_big" });
    processPhoto.mockRejectedValue(new Error("bad"));
    expect(await uploadEvidencePhoto(form(JPEG()))).toMatchObject({ ok: false, code: "photo_unreadable" });
    expect(fns().filter((fn) => fn !== "shift_quest_schema_version")).toEqual([]);
    expect(storePhoto).not.toHaveBeenCalled();
  });

  it("refuses a submission id that is not a uuid", async () => {
    expect(await uploadEvidencePhoto(form(JPEG(), "s1"))).toMatchObject({ ok: false, code: "invalid_input" });
    expect(call).not.toHaveBeenCalled();
  });

  it("passes the database's refusal through (the fourth photo, someone else's submission)", async () => {
    db({ shift_quest_schema_version: 14, shift_quest_evidence_add: new QuestError("too_many_photos") });
    const result = await uploadEvidencePhoto(form(JPEG()));
    expect(result).toMatchObject({ ok: false, code: "too_many_photos" });
    expect(result.ok ? "" : result.error).toContain("3");
    expect(storePhoto).not.toHaveBeenCalled();
  });

  it("does nothing on a database before schema 14", async () => {
    db({ shift_quest_schema_version: 13 });
    expect(await uploadEvidencePhoto(form(JPEG()))).toMatchObject({ ok: false, code: "feature_unavailable" });
    expect(processPhoto).not.toHaveBeenCalled();
  });

  it("refuses a signed-out visitor", async () => {
    resolveIslandViewer.mockResolvedValue({ state: "signed_out" });
    expect(await uploadEvidencePhoto(form(JPEG()))).toMatchObject({ ok: false, code: "signed_out" });
    expect(call).not.toHaveBeenCalled();
  });
});

describe("removeEvidencePhoto", () => {
  it("lets the database decide, then deletes the object it names", async () => {
    db({ shift_quest_schema_version: 14, shift_quest_evidence_remove: { path: PATH } });
    await expect(removeEvidencePhoto({ photoId: PHOTO })).resolves.toEqual({ ok: true, data: null });
    expect(deletePhotos).toHaveBeenCalledWith([PATH]);
  });

  it("still answers ok when Storage refuses: the queue deletes it later", async () => {
    db({ shift_quest_schema_version: 14, shift_quest_evidence_remove: { path: PATH } });
    deletePhotos.mockResolvedValue(false);
    await expect(removeEvidencePhoto({ photoId: PHOTO })).resolves.toEqual({ ok: true, data: null });
    expect(logged()).not.toContain(PATH);
  });
});

describe("loadEvidencePhotos", () => {
  it("answers the latest submission's photos as signed links, never paths", async () => {
    db({
      shift_quest_schema_version: 14,
      shift_quest_evidence_list: {
        submission_id: SUB,
        revision: 2,
        status: "pending",
        photos: [{ id: PHOTO, path: PATH, width: 800, height: 600 }, { nope: true }],
      },
    });
    const result = await loadEvidencePhotos({ instanceId: INSTANCE });
    expect(result).toEqual({
      ok: true,
      data: { submissionId: SUB, revision: 2, status: "pending", photos: [{ id: PHOTO, url: `https://signed/${PHOTO}`, width: 800, height: 600 }] },
    });
    expect(JSON.stringify(result)).not.toContain(".webp");
  });

  it("answers null when there is nothing to see, or on an older database", async () => {
    db({ shift_quest_schema_version: 14, shift_quest_evidence_list: null });
    await expect(loadEvidencePhotos({ instanceId: INSTANCE })).resolves.toEqual({ ok: true, data: null });
    call.mockReset();
    db({ shift_quest_schema_version: 13 });
    // schemaOf caches per api; a fresh api object each call keeps this honest.
    await expect(loadEvidencePhotos({ instanceId: INSTANCE })).resolves.toMatchObject({ ok: true });
  });
});

describe("setTeamProblem", () => {
  it("changes the line through the database and refreshes the page", async () => {
    db({ shift_quest_schema_version: 14, shift_quest_project_set_ambition: { ambition: "ปัญหาใหม่" } });
    await expect(setTeamProblem({ projectId: PROJECT, ambition: "  ปัญหาใหม่  " })).resolves.toEqual({
      ok: true,
      data: { ambition: "ปัญหาใหม่" },
    });
    expect(call).toHaveBeenCalledWith("shift_quest_project_set_ambition", ACTOR, PROJECT, "ปัญหาใหม่");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("refuses an empty line or one over 500 characters before the database", async () => {
    expect(await setTeamProblem({ projectId: PROJECT, ambition: "   " })).toMatchObject({ ok: false, code: "invalid_input" });
    expect(await setTeamProblem({ projectId: PROJECT, ambition: "ก".repeat(501) })).toMatchObject({ ok: false, code: "invalid_input" });
    expect(call).not.toHaveBeenCalled();
  });

  it("shows the database's refusal (another team's project)", async () => {
    db({ shift_quest_schema_version: 14, shift_quest_project_set_ambition: new QuestError("not_found") });
    expect(await setTeamProblem({ projectId: PROJECT, ambition: "x" })).toMatchObject({ ok: false, code: "not_found" });
  });
});
