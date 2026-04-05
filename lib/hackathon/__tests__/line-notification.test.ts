import { sendMentorBookingNotification, validateLineSignature } from "../line";
import type { MentorProfile, MentorBooking } from "@/types/mentor";

const baseMentor: MentorProfile = {
  id: "m1",
  user_id: "u1",
  full_name: "Dr. Test",
  email: "test@example.com",
  profession: "Engineer",
  institution: "MIT",
  bio: "",
  photo_url: null,
  line_user_id: null,
  session_type: "healthcare",
  is_approved: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const baseBooking: MentorBooking = {
  id: "b1",
  mentor_id: "m1",
  student_id: null,
  slot_datetime: "2026-04-10T10:00:00+07:00",
  duration_minutes: 30,
  status: "pending",
  notes: null,
  created_at: "2026-04-04T00:00:00Z",
};

describe("sendMentorBookingNotification", () => {
  it("returns early without calling Line API when mentor has no line_user_id", async () => {
    // If this calls the Line API it would throw (no token set)
    await expect(
      sendMentorBookingNotification({ ...baseMentor, line_user_id: null }, baseBooking, "Alice")
    ).resolves.toBeUndefined();
  });
});

describe("validateLineSignature", () => {
  it("returns false for an invalid signature", () => {
    process.env.LINE_CHANNEL_SECRET = "testsecret";
    const result = validateLineSignature('{"events":[]}', "invalidsignature");
    expect(result).toBe(false);
  });

  it("throws when LINE_CHANNEL_SECRET is not set", () => {
    delete process.env.LINE_CHANNEL_SECRET;
    expect(() => validateLineSignature('{"events":[]}', "sig")).toThrow(
      "LINE_CHANNEL_SECRET is not set"
    );
  });
});
