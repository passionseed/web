/**
 * @jest-environment node
 */
import { isValidOrg, ownerKitPath, signOwnerLink, verifyOwnerLink } from "../owner-link";
import {
  checkOwnerUpload,
  isOwnerUploadKey,
  OWNER_UPLOAD_MAX_BYTES,
  ownerUploadContentType,
  ownerUploadKey,
  ownerUploadsMessage,
} from "../owner-upload";

const SECRET = "test-secret";

describe("owner links", () => {
  it("verifies a link it signed, for the same org and element only", () => {
    const sig = signOwnerLink("mekong-school", "water", SECRET);
    expect(verifyOwnerLink("mekong-school", "water", sig, SECRET)).toBe(true);
    expect(verifyOwnerLink("mekong-school", null, sig, SECRET)).toBe(false);
    expect(verifyOwnerLink("other-org", "water", sig, SECRET)).toBe(false);
    expect(verifyOwnerLink("mekong-school", "water", sig, "another-secret")).toBe(false);
  });

  it("rejects missing or malformed input without throwing", () => {
    expect(verifyOwnerLink(undefined, null, "x", SECRET)).toBe(false);
    expect(verifyOwnerLink("mekong-school", null, undefined, SECRET)).toBe(false);
    expect(verifyOwnerLink("mekong-school", null, "short", SECRET)).toBe(false);
    expect(verifyOwnerLink("mekong-school", null, "x", null)).toBe(false);
  });

  it("only accepts short lowercase slugs", () => {
    expect(isValidOrg("mekong-school")).toBe(true);
    expect(isValidOrg("Mekong School")).toBe(false);
    expect(isValidOrg("../etc")).toBe(false);
    expect(isValidOrg("a")).toBe(false);
  });

  it("builds the page path with the element when there is one", () => {
    expect(ownerKitPath("mekong-school", "water", "abc")).toBe("/hackathon/elemental/owner-kit?o=mekong-school&el=water&s=abc");
    expect(ownerKitPath("cofact", null, "abc")).toBe("/hackathon/elemental/owner-kit?o=cofact&s=abc");
  });
});

describe("owner uploads", () => {
  it("accepts phone videos, photos and PDFs, falling back to the extension", () => {
    expect(ownerUploadContentType("clip.mov", "video/quicktime")).toBe("video/quicktime");
    expect(ownerUploadContentType("IMG_1.HEIC", "")).toBe("image/heic");
    expect(ownerUploadContentType("report.pdf", undefined)).toBe("application/pdf");
    expect(ownerUploadContentType("run.exe", "application/x-msdownload")).toBeNull();
  });

  it("rejects empty, oversized and unknown files", () => {
    expect(checkOwnerUpload({ fileName: "a.mp4", fileType: "video/mp4", fileSize: 10 })).toEqual({ ok: true, contentType: "video/mp4", extension: "mp4" });
    expect(checkOwnerUpload({ fileName: "a.mp4", fileType: "video/mp4", fileSize: 0 }).ok).toBe(false);
    expect(checkOwnerUpload({ fileName: "a.mp4", fileType: "video/mp4", fileSize: OWNER_UPLOAD_MAX_BYTES + 1 }).ok).toBe(false);
    expect(checkOwnerUpload({ fileName: "a.zip", fileType: "application/zip", fileSize: 10 }).ok).toBe(false);
    expect(checkOwnerUpload({ fileName: "", fileType: "video/mp4", fileSize: 10 }).ok).toBe(false);
  });

  it("keeps uploads under the org's folder with an unguessable, ASCII-only name", () => {
    const key = ownerUploadKey("mekong-school", "คลิป เรื่อง1 river.MOV", "mov", new Date("2026-11-27T03:00:00Z"), "r4nd0m");
    expect(key).toBe(`elemental-owners/mekong-school/2026-11-27/${Date.parse("2026-11-27T03:00:00Z")}_r4nd0m_1_river.mov`);
    expect(ownerUploadKey("x-org", "ภาพ.jpg", "jpg", new Date(0), "r")).toMatch(/_r_file\.jpg$/);
  });

  it("only lets an org report keys made for that org", () => {
    const key = ownerUploadKey("mekong-school", "river.MOV", "mov", new Date("2026-11-27T03:00:00Z"), "r4nd0m");
    expect(isOwnerUploadKey("mekong-school", key)).toBe(true);
    expect(isOwnerUploadKey("panthipa", key)).toBe(false);
    expect(isOwnerUploadKey("mekong-school", "elemental-owners/mekong-school/../panthipa/x.mov")).toBe(false);
    expect(isOwnerUploadKey("mekong-school", "hackathon/other.png")).toBe(false);
    expect(isOwnerUploadKey("mekong-school", 42)).toBe(false);
  });
});

describe("owner upload ping", () => {
  const file = (name: string, size: number) => ({
    key: `elemental-owners/panthipa/2026-11-27/1_abc_${name}`,
    size,
    url: `https://bucket.example/${name}`,
  });

  it("says who sent what, with a link per file", () => {
    const msg = ownerUploadsMessage({ org: "panthipa", element: "aether", files: [file("clip.mov", 300 * 1024 ** 2), file("logo.png", 1024 ** 2)] });
    expect(msg).toContain("**panthipa** (aether) uploaded 2 files (301.0 MB)");
    expect(msg).toContain("- [clip.mov](<https://bucket.example/clip.mov>) 300.0 MB");
    expect(msg).toContain("pnpm elemental:owner-kit list panthipa");
  });

  it("stays under Discord's 2000-character limit for a big batch", () => {
    const files = Array.from({ length: 50 }, (_, i) => file(`a_very_long_file_name_from_a_phone_${i}.mov`, 1024 ** 2));
    const msg = ownerUploadsMessage({ org: "panthipa", element: null, files });
    expect(msg).toContain("uploaded 50 files");
    expect(msg).toContain("and 38 more");
    expect(msg.length).toBeLessThan(2000);
  });
});
