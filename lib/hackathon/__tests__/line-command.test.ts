import { parseMentorBookingCommand } from "../line-command";

describe("parseMentorBookingCommand", () => {
  it("matches confirm case-insensitively", () => {
    expect(parseMentorBookingCommand("confirm")).toBe("confirmed");
    expect(parseMentorBookingCommand("Confirm")).toBe("confirmed");
    expect(parseMentorBookingCommand("  CONFIRM  ")).toBe("confirmed");
  });

  it("matches decline case-insensitively", () => {
    expect(parseMentorBookingCommand("decline")).toBe("cancelled");
    expect(parseMentorBookingCommand("Decline")).toBe("cancelled");
    expect(parseMentorBookingCommand("  DECLINE  ")).toBe("cancelled");
  });

  it("ignores unrelated text", () => {
    expect(parseMentorBookingCommand("yes")).toBeNull();
    expect(parseMentorBookingCommand("confirm please")).toBeNull();
  });
});
