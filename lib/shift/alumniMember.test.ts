import { alumniLoginHref, canRsvp, memberStatusNote } from "./alumniMember";

describe("alumni member status", () => {
  it("lets pending accounts RSVP while the team checks, but not declined ones", () => {
    expect(canRsvp("confirmed")).toBe(true);
    expect(canRsvp("pending")).toBe(true);
    expect(canRsvp("declined")).toBe(false);
  });

  it("explains pending and declined, and says nothing once confirmed", () => {
    expect(memberStatusNote("pending")).toContain("เช็ก");
    expect(memberStatusNote("declined")).toContain("LINE");
    expect(memberStatusNote("confirmed")).toBeNull();
  });

  it("comes back to the same page after login, round included", () => {
    expect(alumniLoginHref("/shift/alumni?round=1")).toBe("/login?next=%2Fshift%2Falumni%3Fround%3D1");
  });
});
