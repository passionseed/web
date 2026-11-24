import { crc16, promptPayPayload } from "../promptpay";

describe("promptPayPayload", () => {
  it("matches the known CRC check value for CRC-16/CCITT-FALSE", () => {
    expect(crc16("123456789")).toBe("29B1");
  });

  it("builds a one-time QR with the amount for a 13-digit ID", () => {
    const payload = promptPayPayload("1234567890123", 149);
    expect(payload).toBe(
      "00020101021229370016A000000677010111021312345678901235303764540614" +
        "9.005802TH6304" +
        crc16(
          "00020101021229370016A0000006770101110213123456789012353037645406149.005802TH6304",
        ),
    );
  });

  it("turns a mobile number into the 0066 form", () => {
    expect(promptPayPayload("081-234-5678", 199)).toContain("01130066812345678");
  });

  it("refuses a bad ID or amount", () => {
    expect(promptPayPayload("12345", 199)).toBeNull();
    expect(promptPayPayload("1234567890123", 0)).toBeNull();
    expect(promptPayPayload("1234567890123", Number.NaN)).toBeNull();
  });
});
