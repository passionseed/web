import { MAX_SLIP_BYTES } from "../slip-image";
import {
  anyLiveProof,
  checkStoryProofFile,
  MAX_STORY_PROOF_BYTES,
  replacedProofPath,
  revokeOutcome,
  storyProofPath,
  storyProofStatusOf,
  storyProofUploadBlock,
  storyProofUpsert,
} from "../story-proof";

const REG = "3f9a2c1d-0b1c-4d2e-8f90-123456789abc";

describe("checkStoryProofFile: what the upload takes", () => {
  it("takes the slip's types, each with its extension", () => {
    expect(checkStoryProofFile({ type: "image/jpeg", size: 1000 })).toEqual({ ok: true, ext: "jpg" });
    expect(checkStoryProofFile({ type: "image/png", size: 1000 })).toEqual({ ok: true, ext: "png" });
    expect(checkStoryProofFile({ type: "image/webp", size: 1000 })).toEqual({ ok: true, ext: "webp" });
  });

  it("refuses HEIC, other types and no type (the browser re-encodes HEIC first, like a slip)", () => {
    for (const type of ["image/heic", "image/gif", "application/pdf", "image/svg+xml", ""]) {
      expect(checkStoryProofFile({ type, size: 1000 })).toEqual({ ok: false, error: "file_type" });
    }
  });

  it("caps the size at the slip limit, and refuses an empty file or none", () => {
    expect(MAX_STORY_PROOF_BYTES).toBe(MAX_SLIP_BYTES);
    expect(checkStoryProofFile({ type: "image/png", size: MAX_SLIP_BYTES })).toEqual({ ok: true, ext: "png" });
    expect(checkStoryProofFile({ type: "image/png", size: MAX_SLIP_BYTES + 1 })).toEqual({ ok: false, error: "file_size" });
    expect(checkStoryProofFile({ type: "image/png", size: 0 })).toEqual({ ok: false, error: "file_size" });
    expect(checkStoryProofFile(null)).toEqual({ ok: false, error: "no_file" });
  });
});

describe("storyProofUploadBlock: when a sign-up may upload", () => {
  it("only while sharing is open", () => {
    expect(storyProofUploadBlock({ shareOpen: false, registrationStatus: "paid" })).toBe("closed");
    expect(storyProofUploadBlock({ shareOpen: true, registrationStatus: "paid" })).toBeNull();
  });

  it("paid or not, but never a cancelled sign-up", () => {
    for (const status of ["pending", "review", "paid"]) expect(storyProofUploadBlock({ shareOpen: true, registrationStatus: status })).toBeNull();
    expect(storyProofUploadBlock({ shareOpen: true, registrationStatus: "cancelled" })).toBe("cancelled");
  });
});

describe("where a proof is stored", () => {
  it("under the event's folder, then the sign-up's, named by upload time", () => {
    expect(storyProofPath("elemental-2026", REG, "jpg", 1764800000000, "a1b2c3d4e5f6")).toBe(`elemental-2026/${REG}/1764800000000-a1b2c3d4e5f6.jpg`);
  });

  it("refuses a random part that isn't 12 hex characters", () => {
    expect(() => storyProofPath("elemental-2026", REG, "jpg", 1, "../../x")).toThrow();
  });
});

describe("replacing a proof", () => {
  const next = `elemental-2026/${REG}/2-bbbbbbbbbbbb.png`;
  it("deletes the previous file, live or revoked", () => {
    expect(replacedProofPath({ storagePath: `elemental-2026/${REG}/1-aaaaaaaaaaaa.jpg` }, next)).toBe(`elemental-2026/${REG}/1-aaaaaaaaaaaa.jpg`);
  });

  it("deletes nothing on a first upload, or when the path is the same", () => {
    expect(replacedProofPath(null, next)).toBeNull();
    expect(replacedProofPath({ storagePath: next }, next)).toBeNull();
  });

  it("writes the new file live again, clearing a revoke", () => {
    expect(storyProofUpsert({ eventSlug: "elemental-2026", registrationId: REG, storagePath: next, uploadedAt: "2026-12-01T03:00:00.000Z" })).toEqual({
      event_slug: "elemental-2026",
      registration_id: REG,
      storage_path: next,
      uploaded_at: "2026-12-01T03:00:00.000Z",
      revoked_at: null,
      revoked_by: null,
    });
  });
});

describe("a proof's status", () => {
  it("is none without a row, unlocked while live, revoked once staff took it back", () => {
    expect(storyProofStatusOf(null)).toBe("none");
    expect(storyProofStatusOf({ revokedAt: null })).toBe("unlocked");
    expect(storyProofStatusOf({ revokedAt: "2026-12-02T03:00:00Z" })).toBe("revoked");
  });
});

describe("anyLiveProof: one live proof from any member unlocks the team", () => {
  const rows = [
    { registrationId: "a", revokedAt: null },
    { registrationId: "b", revokedAt: "2026-12-02T03:00:00Z" },
  ];
  it("is true when any member has a live proof", () => {
    expect(anyLiveProof(rows, ["x", "a"])).toBe(true);
  });

  it("is false for revoked proofs, other teams' proofs, or no members", () => {
    expect(anyLiveProof(rows, ["b"])).toBe(false);
    expect(anyLiveProof(rows, ["x", "y"])).toBe(false);
    expect(anyLiveProof(rows, [])).toBe(false);
  });
});

describe("revokeOutcome: staff taking a proof back", () => {
  it("revokes a live proof, leaves a revoked one alone, and says when there's none", () => {
    expect(revokeOutcome({ revokedAt: null })).toBe("revoked");
    expect(revokeOutcome({ revokedAt: "2026-12-02T03:00:00Z" })).toBe("already_revoked");
    expect(revokeOutcome(null)).toBe("not_found");
  });
});
