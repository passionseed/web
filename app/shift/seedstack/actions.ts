"use server";

import { revalidatePath } from "next/cache";

import { isAnonymousUser } from "@/lib/supabase/auth";
import { canLinkDevice, parseBirthDate, seedstackConsentState } from "@/lib/seedstack/consent";
import { normalizeUserCode } from "@/lib/seedstack/link";
import {
  approveLinkRequest,
  findParentLinkTarget,
  getSeedstackConsent,
  parentNoLongerNeeded,
  recordParentDecision,
  recordStudentConsent,
  rotateParentLink,
  withdrawSeedstackConsent,
  type ParentLinkTarget,
} from "@/lib/seedstack/server";
import { createClient } from "@/utils/supabase/server";

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.passionseed.org";
const parentUrl = (token: string) => `${SITE_URL}/shift/seedstack/parent/${token}`;
const SYSTEM_ERROR = "ระบบขัดข้อง ลองใหม่อีกครั้ง หรือติดต่อทีมงานทาง LINE ของ SHIFT";

async function signedInUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user && !isAnonymousUser(data.user) ? data.user.id : null;
}

class StudentError extends Error {}

/** Any signed-in, non-anonymous account; a SHIFT seat is not required. */
async function asStudent<T>(run: (userId: string) => Promise<T>): Promise<Result<T>> {
  const userId = await signedInUserId();
  if (!userId) return { ok: false, error: "เข้าสู่ระบบด้วย Discord ก่อนนะ" };
  try {
    const value = await run(userId);
    revalidatePath("/shift/seedstack");
    return { ok: true, value };
  } catch (error) {
    if (error instanceof StudentError) return { ok: false, error: error.message };
    console.error("[seedstack] action failed:", error);
    return { ok: false, error: SYSTEM_ERROR };
  }
}

/** Returns the parent link to forward, or null when the student is 20 or over. */
export async function giveStudentConsent(rawBirthDate: string): Promise<Result<string | null>> {
  return asStudent(async (userId) => {
    const birthDate = parseBirthDate(rawBirthDate);
    if (!birthDate) throw new StudentError("ใส่วันเกิดให้ถูกก่อนนะ");
    const token = await recordStudentConsent(userId, birthDate);
    return token ? parentUrl(token) : null;
  });
}

export async function newParentLink(): Promise<Result<string>> {
  return asStudent(async (userId) => parentUrl(await rotateParentLink(userId)));
}

/** Approves the OpenCode device showing `rawCode`. The CLI then collects its own token. */
export async function approveDeviceLink(rawCode: string): Promise<Result<string>> {
  return asStudent(async (userId) => {
    if (!canLinkDevice(seedstackConsentState(await getSeedstackConsent(userId)))) {
      throw new StudentError("กดยินยอมด้านบนก่อนนะ");
    }
    const code = normalizeUserCode(rawCode);
    if (!code || !(await approveLinkRequest(userId, code))) {
      throw new StudentError("รหัสนี้หมดอายุหรือไม่ถูกต้อง พิมพ์ /seedstack-connect ใน OpenCode ใหม่อีกครั้ง");
    }
    return code;
  });
}

export async function withdrawConsent(): Promise<Result<null>> {
  return asStudent(async (userId) => {
    await withdrawSeedstackConsent(userId);
    return null;
  });
}

const RELATIONSHIPS = new Set(["พ่อ", "แม่", "ผู้ปกครอง"]);
const PARENT_LINK_DEAD = "ลิงก์นี้ใช้ไม่ได้แล้ว ขอลิงก์ใหม่ได้ ผู้เรียนสร้างได้เองที่หน้า SeedStack ค่ะ";
const PARENT_ALREADY_AGREED =
  "ผู้ปกครองยินยอมไว้แล้วค่ะ ถ้าเปลี่ยนใจ กดถอนความยินยอม ระบบจะหยุดเก็บและลบข้อมูลที่เก็บไว้ทั้งหมด";
const PARENT_NOT_NEEDED = "ไม่ต้องใช้ลิงก์นี้แล้วค่ะ ผู้เรียนอายุครบ 20 ปีแล้ว ความยินยอมของผู้เรียนเองเพียงพอตามกฎหมาย";

/** Why a parent may not answer from this link right now, or null if they may. */
function parentDecisionRefusal(target: ParentLinkTarget | null): string | null {
  if (!target || target.state === "none" || target.state === "withdrawn") return PARENT_LINK_DEAD;
  if (target.parentDecision === "agreed") return PARENT_ALREADY_AGREED;
  if (parentNoLongerNeeded(target)) return PARENT_NOT_NEEDED;
  return null;
}

/** Parent answers from their link. No account: the link token is the credential. */
export async function submitParentDecision(input: {
  token: string;
  agree: boolean;
  parentName: string;
  relationship: string;
}): Promise<Result<null>> {
  // Server actions are callable directly, so do not trust the client's types.
  if (typeof input?.token !== "string" || typeof input.agree !== "boolean") {
    return { ok: false, error: PARENT_LINK_DEAD };
  }
  const parentName = typeof input.parentName === "string" ? input.parentName.trim().slice(0, 120) : "";
  if (!parentName) return { ok: false, error: "กรอกชื่อผู้ปกครองก่อนนะคะ" };
  if (!RELATIONSHIPS.has(input.relationship)) return { ok: false, error: "เลือกความเกี่ยวข้องก่อนนะคะ" };

  try {
    const refusal = parentDecisionRefusal(await findParentLinkTarget(input.token));
    if (refusal) return { ok: false, error: refusal };
    const saved = await recordParentDecision({
      rawToken: input.token,
      agree: input.agree,
      parentName,
      relationship: input.relationship,
    });
    // The update itself refuses an already-agreed row, so a racing answer lands here too.
    if (!saved) return { ok: false, error: PARENT_LINK_DEAD };
    revalidatePath(`/shift/seedstack/parent/${input.token}`);
    return { ok: true, value: null };
  } catch (error) {
    console.error("[seedstack] parent decision failed:", error);
    return { ok: false, error: SYSTEM_ERROR };
  }
}

export async function parentWithdraw(token: string): Promise<Result<null>> {
  try {
    const target = await findParentLinkTarget(token);
    if (!target) return { ok: false, error: "ลิงก์นี้ใช้ไม่ได้แล้วค่ะ" };
    await withdrawSeedstackConsent(target.userId);
    return { ok: true, value: null };
  } catch (error) {
    console.error("[seedstack] parent withdraw failed:", error);
    return { ok: false, error: SYSTEM_ERROR };
  }
}
