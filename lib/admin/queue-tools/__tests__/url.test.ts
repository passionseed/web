import {
  isUuid,
  pickOption,
  readParam,
  readTextParam,
  readUuidParam,
  withQuery,
} from "@/lib/admin/queue-tools/url";

const ID = "0b7c6f5e-1d2a-4c3b-9e8f-7a6b5c4d3e2f";

describe("readParam", () => {
  it("reads URLSearchParams and Next's searchParams records alike", () => {
    expect(readParam(new URLSearchParams("a=1&a=2"), "a")).toBe("1");
    expect(readParam({ a: "1" }, "a")).toBe("1");
    expect(readParam({ a: ["first", "second"] }, "a")).toBe("first");
    expect(readParam({}, "a")).toBeUndefined();
    expect(readParam(new URLSearchParams(""), "a")).toBeUndefined();
  });
});

describe("pickOption", () => {
  it("only accepts listed values", () => {
    const options = ["all", "new"] as const;
    expect(pickOption("new", options, "all")).toBe("new");
    expect(pickOption("NEW", options, "all")).toBe("all");
    expect(pickOption(undefined, options, "all")).toBe("all");
    expect(pickOption(null, options, "all")).toBe("all");
  });
});

describe("ids and text", () => {
  it("accepts UUIDs only, lower-cased", () => {
    expect(isUuid(ID)).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(readUuidParam({ id: ID.toUpperCase() }, "id")).toBe(ID);
    expect(readUuidParam({ id: "1; drop table" }, "id")).toBeNull();
  });

  it("trims and caps free text", () => {
    expect(readTextParam({ q: "  hi  " }, "q")).toBe("hi");
    expect(readTextParam({ q: "x".repeat(500) }, "q", 10)).toHaveLength(10);
    expect(readTextParam({}, "q")).toBe("");
  });
});

describe("withQuery", () => {
  it("drops empty values and encodes the rest", () => {
    expect(withQuery("/admin/x", { a: null, b: undefined, c: "", d: false })).toBe("/admin/x");
    expect(withQuery("/admin/x", { cohort: "SHIFT[3]", page: 2 })).toBe(
      "/admin/x?cohort=SHIFT%5B3%5D&page=2",
    );
  });
});
