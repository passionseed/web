import { joinConfirmMessage, paymentLineMessage } from "../paymentMessage";

const cohort = { name: "SHIFT[2]", priceBaht: 990 };

describe("paymentLineMessage", () => {
  it("includes everything an admin needs to match the slip", () => {
    const message = paymentLineMessage(cohort, {
      nickname: " มิว ",
      fullName: "มิว ใจดี",
      igHandle: "https://instagram.com/mew.builds/",
      parentContact: "081-234-5678",
    });
    expect(message).toContain("แจ้งโอนค่าสมัคร SHIFT[2]");
    expect(message).toContain("ชื่อเล่น: มิว (มิว ใจดี)");
    expect(message).toContain("IG: @mew.builds");
    expect(message).toContain("ติดต่อผู้ปกครอง: 081-234-5678");
    expect(message).toContain("ยอดโอน: ฿990");
  });

  it("skips empty optional fields", () => {
    const message = paymentLineMessage(cohort, { nickname: "มิว", igHandle: "" });
    expect(message).toContain("ชื่อเล่น: มิว\n");
    expect(message).not.toContain("IG:");
    expect(message).not.toContain("ติดต่อผู้ปกครอง:");
  });

  it("still works without an applicant (round page)", () => {
    const message = paymentLineMessage(cohort);
    expect(message).not.toContain("ชื่อเล่น:");
    expect(message).toContain("ยอดโอน: ฿990");
  });
});

describe("join link in LINE messages", () => {
  const joinUrl = "https://www.passionseed.org/shift/join/abcdefghijklmnopqrstuvwx";

  it("payment message carries the applicant's personal link", () => {
    const message = paymentLineMessage(cohort, { nickname: "มิว", joinUrl });
    expect(message).toContain(`ลิงก์เข้า Discord: ${joinUrl}`);
  });

  it("confirmation names the round and ends with the link", () => {
    const message = joinConfirmMessage({ cohortName: "SHIFT[2]", nickname: " มิว ", joinUrl });
    expect(message).toContain("ยืนยันที่นั่ง SHIFT[2] แล้ว ยินดีต้อนรับ มิว");
    expect(message.endsWith(joinUrl)).toBe(true);
  });
});
