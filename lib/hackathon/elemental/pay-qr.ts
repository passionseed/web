import QRCode from "qrcode";

import { elementalPromptPayPayload } from "./promptpay";

/**
 * The pay page's QR as a PNG data URL, with the amount filled in. Null when
 * PROMPTPAY_ID isn't set, and the page shows the printed QR instead.
 */
export async function elementalPayQr(amountBaht: number): Promise<string | null> {
  const payload = elementalPromptPayPayload(amountBaht);
  if (!payload) return null;
  try {
    return await QRCode.toDataURL(payload, { width: 720, margin: 2, errorCorrectionLevel: "M" });
  } catch (error) {
    console.error("[elemental] PromptPay QR failed", error);
    return null;
  }
}
