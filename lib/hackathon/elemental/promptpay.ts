/**
 * A PromptPay QR with the amount already filled in, so the bank app opens
 * with the exact price and nobody types it (EMVCo merchant-presented QR, as
 * the Bank of Thailand's PromptPay spec uses it).
 *
 * The PromptPay ID comes from the PROMPTPAY_ID env var (the 13-digit ID the
 * printed QR in public/shift/pay pays). Without it, callers fall back to the
 * printed QR, where the payer types the amount.
 */

const PROMPTPAY_AID = "A000000677010111";

function field(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

/** CRC-16/CCITT-FALSE, which the EMVCo QR spec uses for its checksum (tag 63). */
export function crc16(text: string): string {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i++) {
    crc ^= text.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** The tag 29 proxy: a 13-digit national or tax ID, or a Thai mobile number. */
function proxyField(id: string): string | null {
  const digits = id.replace(/\D/g, "");
  if (digits.length === 13) return field("02", digits);
  if (digits.length === 10 && digits.startsWith("0")) return field("01", `0066${digits.slice(1)}`);
  return null;
}

/** The QR text for paying `amountBaht` to `promptPayId`, or null if the ID or amount is unusable. */
export function promptPayPayload(promptPayId: string, amountBaht: number): string | null {
  const proxy = proxyField(promptPayId);
  if (!proxy || !Number.isFinite(amountBaht) || amountBaht <= 0) return null;
  const body =
    field("00", "01") +
    field("01", "12") + // 12: a one-time QR with an amount
    field("29", field("00", PROMPTPAY_AID) + proxy) +
    field("53", "764") + // THB
    field("54", amountBaht.toFixed(2)) +
    field("58", "TH") +
    "6304";
  return body + crc16(body);
}

/** The payload for our own PromptPay ID, or null when PROMPTPAY_ID isn't set (server only). */
export function elementalPromptPayPayload(amountBaht: number): string | null {
  const id = process.env.PROMPTPAY_ID;
  return id ? promptPayPayload(id, amountBaht) : null;
}
