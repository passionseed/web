"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { withdrawSeedstackConsent } from "@/lib/seedstack/server";
import { PARENT_RELATIONSHIPS, parentConsentState } from "@/lib/shift/parentConsent";
import {
  SHIFT_PARENT_PREFIX,
  applyShiftParentAiConsent,
  findShiftParentTarget,
  recordShiftParentDecision,
  withdrawShiftParentConsent,
  type ParentSignature,
} from "@/lib/shift/parentConsentServer";

type Result = { ok: true } | { ok: false; error: string };

const LINK_DEAD = "ลิงก์นี้ใช้ไม่ได้แล้วค่ะ ติดต่อทีมงานทาง LINE ของ SHIFT ได้เลย";
const ALREADY_AGREED = "บันทึกความยินยอมไว้แล้วค่ะ";
const SYSTEM_ERROR = "ระบบขัดข้อง ลองใหม่อีกครั้ง หรือติดต่อทีมงานทาง LINE ของ SHIFT";
const RELATIONSHIPS = new Set<string>(PARENT_RELATIONSHIPS);

/** Where the parent answered from, kept with their typed name as the signature record. */
async function requestOrigin(): Promise<Pick<ParentSignature, "ip" | "userAgent">> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  return { ip, userAgent: h.get("user-agent")?.slice(0, 400) ?? null };
}

/** Parent answers from their emailed link. No account: the link token is the credential. */
export async function submitShiftParentDecision(input: {
  token: string;
  agree: boolean;
  parentName: string;
  relationship: string;
  confirmed: boolean;
  /** Optional, separate consent to AI progress tracking (SeedStack). */
  aiAgreed: boolean;
}): Promise<Result> {
  // Server actions are callable directly, so do not trust the client's types.
  if (typeof input?.token !== "string" || typeof input.agree !== "boolean") {
    return { ok: false, error: LINK_DEAD };
  }
  const parentName = typeof input.parentName === "string" ? input.parentName.trim().slice(0, 120) : "";
  if (parentName.length < 2) return { ok: false, error: "พิมพ์ชื่อ-นามสกุลผู้ปกครองก่อนนะคะ" };
  if (!RELATIONSHIPS.has(input.relationship)) return { ok: false, error: "เลือกความเกี่ยวข้องก่อนนะคะ" };
  if (input.agree && input.confirmed !== true) {
    return { ok: false, error: "ติ๊กยืนยันว่าอ่านรายละเอียดแล้วก่อนนะคะ" };
  }

  try {
    const target = await findShiftParentTarget(input.token);
    if (!target) return { ok: false, error: LINK_DEAD };
    const state = parentConsentState(target);
    if (state === "agreed") return { ok: false, error: ALREADY_AGREED };
    if (state === "withdrawn") return { ok: false, error: LINK_DEAD };

    const aiAgreed = input.agree && input.aiAgreed === true;
    const saved = await recordShiftParentDecision(
      input.token,
      { agree: input.agree, aiAgreed },
      { parentName, relationship: input.relationship, ...(await requestOrigin()) },
    );
    // The update itself refuses an already-agreed row, so a racing answer lands here too.
    if (!saved) return { ok: false, error: ALREADY_AGREED };
    // A student already waiting on a SeedStack parent is unblocked by this answer.
    if (aiAgreed && target.user_id) {
      await applyShiftParentAiConsent(target.user_id).catch((error) =>
        console.error("[shift-parent] SeedStack consent sync failed:", error),
      );
    }
    revalidatePath(`${SHIFT_PARENT_PREFIX}${input.token}`);
    return { ok: true };
  } catch (error) {
    console.error("[shift-parent] decision failed:", error);
    return { ok: false, error: SYSTEM_ERROR };
  }
}

/** Withdraws everything this parent agreed to, AI tracking included. */
export async function withdrawShiftParentDecision(token: string): Promise<Result> {
  if (typeof token !== "string") return { ok: false, error: LINK_DEAD };
  try {
    const target = await findShiftParentTarget(token);
    if (!target) return { ok: false, error: LINK_DEAD };
    const withdrawn = await withdrawShiftParentConsent(token);
    if (!withdrawn) return { ok: false, error: LINK_DEAD };
    // SeedStack's own withdrawal stops collection and deletes what was stored.
    if (target.parent_ai_consented_at && target.user_id) {
      await withdrawSeedstackConsent(target.user_id);
    }
    revalidatePath(`${SHIFT_PARENT_PREFIX}${token}`);
    return { ok: true };
  } catch (error) {
    console.error("[shift-parent] withdraw failed:", error);
    return { ok: false, error: SYSTEM_ERROR };
  }
}
