import { ELEMENTAL, prizeTotal, thaiDateLine } from "@/components/hackathon/poster/elemental/facts";

/**
 * The line under an Elemental link preview (LINE, Facebook, X) and in search:
 * what it is, when, where, who for, the prize and both prices. All facts come
 * from facts.ts, so the preview changes with them.
 */
export function elementalShareDescription(): string {
  return `${ELEMENTAL.edition} Hackathon: ดิน น้ำ ลม ไฟ ${thaiDateLine()} ${ELEMENTAL.venueTh} สำหรับนักเรียน ${ELEMENTAL.gradesTh} รางวัลรวม ${prizeTotal()} บาท สมัครคนเดียว ฿${ELEMENTAL.priceBaht} มากับเพื่อน ฿${ELEMENTAL.groupPriceBaht} ต่อคน`;
}

/**
 * Where the person is reading the result, for the Story share. Most arrive
 * from a friend's Story, so inside Instagram's own browser, where the share
 * sheet often can't take an image (Android's WebView has no Web Share at
 * all). Knowing the app lets the page show the way that works there: press
 * and hold the card to save it, or open the page in a real browser.
 */
export type InAppBrowser = "instagram" | "facebook" | "line" | "tiktok" | "webview";

export function inAppBrowser(userAgent: string): InAppBrowser | null {
  if (/Instagram/i.test(userAgent)) return "instagram";
  if (/FBAN|FBAV|FB_IAB/i.test(userAgent)) return "facebook";
  if (/\bLine\//i.test(userAgent)) return "line";
  if (/TikTok|musical_ly|BytedanceWebview/i.test(userAgent)) return "tiktok";
  if (/; wv\)/.test(userAgent)) return "webview";
  return null;
}

/** The same page, asking LINE to open it in the phone's browser (LINE's documented openExternalBrowser=1). */
export function lineExternalUrl(url: string): string {
  const u = new URL(url);
  u.searchParams.set("openExternalBrowser", "1");
  return u.toString();
}
