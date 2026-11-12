import { groupInputSchema, pickedStudents, type MentorGroup } from "./groups";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

const groups: MentorGroup[] = [
  { id: "g1", name: "ทีม 1", mentorIds: ["me"], studentIds: ["amy", "ben"] },
  { id: "g2", name: "ทีม 2", mentorIds: ["other", "me"], studentIds: ["cat"] },
  { id: "g3", name: "ทีม 3", mentorIds: ["other"], studentIds: ["dan"] },
];

describe("pickedStudents", () => {
  it("is every student of the groups I mentor, one group, or everyone", () => {
    expect([...pickedStudents(groups, "mine", "me")!].sort()).toEqual(["amy", "ben", "cat"]);
    expect([...pickedStudents(groups, "g3", "me")!]).toEqual(["dan"]);
    expect(pickedStudents(groups, "all", "me")).toBeNull();
  });

  it("shows everyone to staff without a group, and for a group that is gone", () => {
    expect(pickedStudents(groups, "mine", "nobody")).toBeNull();
    expect(pickedStudents(groups, "deleted", "me")).toBeNull();
  });
});

describe("groupInputSchema", () => {
  it("trims the name and drops repeated people", () => {
    expect(groupInputSchema.parse({ name: "  ทีม A ", mentorIds: [A], studentIds: [B, B] })).toEqual({ name: "ทีม A", mentorIds: [A], studentIds: [B] });
  });
  it("rejects an empty name, ids that are not user ids, and extra fields", () => {
    expect(groupInputSchema.safeParse({ name: " ", mentorIds: [], studentIds: [] }).success).toBe(false);
    expect(groupInputSchema.safeParse({ name: "x", mentorIds: ["me"], studentIds: [] }).success).toBe(false);
    expect(groupInputSchema.safeParse({ name: "x", mentorIds: [], studentIds: [], boardId: A }).success).toBe(false);
  });
});
