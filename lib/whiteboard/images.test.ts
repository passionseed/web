import { FILE_ID, fetchOrder, imageUrl, parseDataUrl, shouldCompress } from "./images";

describe("parseDataUrl", () => {
  it("splits type and bytes", () => {
    expect(parseDataUrl("data:image/PNG;base64,AAAA")).toEqual({ mimeType: "image/png", base64: "AAAA" });
  });
  it("rejects anything that is not a base64 data URL", () => {
    expect(parseDataUrl("https://example.com/a.png")).toBeNull();
    expect(parseDataUrl("data:image/png,AAAA")).toBeNull();
  });
});

describe("FILE_ID and imageUrl", () => {
  it("accepts Excalidraw ids and refuses path tricks", () => {
    expect(FILE_ID.test("3f2a9c0d1e")).toBe(true);
    expect(FILE_ID.test("abc_DEF-123")).toBe(true);
    expect(FILE_ID.test("../x")).toBe(false);
    expect(FILE_ID.test("")).toBe(false);
  });
  it("builds the per-image route", () => {
    expect(imageUrl("b1", "f1")).toBe("/api/whiteboards/b1/files/f1");
  });
});

describe("fetchOrder", () => {
  const img = (fileId: string, x: number, y: number) => ({ fileId, x, y, width: 10, height: 10 });

  it("puts the images nearest the view first", () => {
    const order = fetchOrder([img("far", 1000, 1000), img("near", 0, 0), img("mid", 200, 0)], { x: 5, y: 5 });
    expect(order).toEqual(["near", "mid", "far"]);
  });

  it("lists a file used twice once, at its nearest copy", () => {
    const order = fetchOrder([img("a", 1000, 0), img("b", 300, 0), img("a", 0, 0)], { x: 5, y: 5 });
    expect(order).toEqual(["a", "b"]);
  });
});

describe("shouldCompress", () => {
  it("re-encodes big photos and screenshots only", () => {
    expect(shouldCompress("image/png", 2_000_000)).toBe(true);
    expect(shouldCompress("image/jpeg", 500_000)).toBe(true);
    expect(shouldCompress("image/png", 50_000)).toBe(false);
    expect(shouldCompress("image/gif", 2_000_000)).toBe(false);
    expect(shouldCompress("image/svg+xml", 2_000_000)).toBe(false);
  });
});
