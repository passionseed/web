import { ACCEPT, MAX_PHOTOS, MAX_PICK_BYTES, MAX_SIDE, MAX_UPLOAD_BYTES, PHOTO_SCHEMA, fitInside } from "../photos";

describe("photo limits", () => {
  it("match the database and the bucket (20261115130000, 20261115130100)", () => {
    expect(MAX_PHOTOS).toBe(3);
    expect(MAX_SIDE).toBe(1600);
    expect(MAX_UPLOAD_BYTES).toBe(4194304);
    expect(MAX_PICK_BYTES).toBe(8 * 1024 * 1024);
    expect(PHOTO_SCHEMA).toBe(14);
    expect(ACCEPT).toBe("image/*");
  });
});

describe("fitInside", () => {
  it("shrinks the long side to 1600 and keeps the shape", () => {
    expect(fitInside(4032, 3024)).toEqual({ width: 1600, height: 1200 });
    expect(fitInside(3024, 4032)).toEqual({ width: 1200, height: 1600 });
  });

  it("never enlarges a small picture", () => {
    expect(fitInside(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("keeps at least one pixel on a very thin picture", () => {
    expect(fitInside(10000, 2)).toEqual({ width: 1600, height: 1 });
  });
});
