import { MAX_SLIP_BYTES } from "../slip-image";
import {
  anyLiveProof,
  checkStoryProofBytes,
  checkStoryProofFile,
  MAX_STORY_PROOF_BYTES,
  proofHasImage,
  replacedProofPath,
  revokePlan,
  sniffStoryProofType,
  STORY_PROOF_SNIFF_BYTES,
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

describe("revokePlan: staff taking a proof back deletes its screenshot", () => {
  const path = `elemental-2026/${REG}/1-aaaaaaaaaaaa.jpg`;
  it("revokes a live proof and deletes its file", () => {
    expect(revokePlan({ storagePath: path, revokedAt: null })).toEqual({ outcome: "revoke", deletePath: path });
  });

  it("deletes a revoked proof's file again (harmless if gone), and leaves the row as it is", () => {
    expect(revokePlan({ storagePath: path, revokedAt: "2026-12-02T03:00:00Z" })).toEqual({ outcome: "already_revoked", deletePath: path });
  });

  it("does nothing without a row", () => {
    expect(revokePlan(null)).toEqual({ outcome: "not_found", deletePath: null });
  });

  it("shows staff no image for a revoked proof, since its file is deleted", () => {
    expect(proofHasImage({ revokedAt: null })).toBe(true);
    expect(proofHasImage({ revokedAt: "2026-12-02T03:00:00Z" })).toBe(false);
  });
});

describe("sniffStoryProofType: the first bytes, not the label", () => {
  const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(Math.max(0, STORY_PROOF_SNIFF_BYTES - b.length)).fill(0)]);
  const ascii = (t: string) => [...t].map((c) => c.charCodeAt(0));
  const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0);
  const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  const WEBP = bytes(...ascii("RIFF"), 0x24, 0x00, 0x00, 0x00, ...ascii("WEBP"));

  it("knows JPEG, PNG and WEBP", () => {
    expect(sniffStoryProofType(JPEG)).toBe("image/jpeg");
    expect(sniffStoryProofType(PNG)).toBe("image/png");
    expect(sniffStoryProofType(WEBP)).toBe("image/webp");
  });

  it("refuses anything else: text, HTML or SVG renamed .png, a GIF, a RIFF that isn't WEBP, too few bytes", () => {
    expect(sniffStoryProofType(bytes(...ascii("hello world!")))).toBeNull();
    expect(sniffStoryProofType(bytes(...ascii("<svg xmlns=")))).toBeNull();
    expect(sniffStoryProofType(bytes(...ascii("<html><body")))).toBeNull();
    expect(sniffStoryProofType(bytes(...ascii("GIF89a")))).toBeNull();
    expect(sniffStoryProofType(bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WAVE")))).toBeNull();
    expect(sniffStoryProofType(new Uint8Array([0xff, 0xd8]))).toBeNull();
    expect(sniffStoryProofType(new Uint8Array([]))).toBeNull();
  });

  it("stores the type the bytes say, refusing the rest as file_type", () => {
    expect(checkStoryProofBytes(PNG)).toEqual({ ok: true, ext: "png", contentType: "image/png" });
    expect(checkStoryProofBytes(JPEG)).toEqual({ ok: true, ext: "jpg", contentType: "image/jpeg" });
    expect(checkStoryProofBytes(WEBP)).toEqual({ ok: true, ext: "webp", contentType: "image/webp" });
    expect(checkStoryProofBytes(bytes(...ascii("not an image")))).toEqual({ ok: false, error: "file_type" });
  });
});
