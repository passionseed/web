"use server";

import { revalidatePath } from "next/cache";

import { isAnonymousUser } from "@/lib/supabase/auth";
import { seedstackConsentState } from "@/lib/seedstack/consent";
import { normalizeUserCode } from "@/lib/seedstack/link";
import {
  approveLinkRequest,
  findParentLinkTarget,
  findShiftStudent,
  getSeedstackConsent,
  recordParentDecision,
  recordStudentConsent,
  rotateParentLink,
  withdrawSeedstackConsent,
} from "@/lib/seedstack/server";
import { createClient } from "@/utils/supabase/server";

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.passionseed.org";
const parentUrl = (token: string) => `${SITE_URL}/shift/seedstack/parent/${token}`;

async function signedInUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user && !isAnonymousUser(data.user) ? data.user.id : null;
}

class StudentError extends Error {}

/** Signed in AND bound to a paid SHIFT seat; anything else is refused. */
async function asStudent<T>(run: (userId: string) => Promise<T>): Promise<Result<T>> {
  const userId = await signedInUserId();
  if (!userId) return { ok: false, error: "เข้าสู่ระบบด้วย Discord ก่อนนะ" };
  try {
    if (!(await findShiftStudent(userId))) {
      return { ok: false, error: "บัญชีนี้ยังไม่ได้ผูกกับที่นั่ง SHIFT ใช้ลิงก์เข้า Discord จากข้อความยืนยันการจ่ายเงินก่อนนะ" };
    }
    const value = await run(userId);
    revalidatePath("/shift/seedstack");
    return { ok: true, value };
  } catch (error) {
    if (error instanceof StudentError) return { ok: false, error: error.message };
    console.error("[seedstack] action failed:", error);
    return { ok: false, error: "ระบบขัดข้อง ลองใหม่อีกครั้ง หรือทักพี่ใน LINE" };
  }
}

export async function giveStudentConsent(): Promise<Result<string>> {
  return asStudent(async (userId) => parentUrl(await recordStudentConsent(userId)));
}

export async function newParentLink(): Promise<Result<string>> {
  return asStudent(async (userId) => parentUrl(await rotateParentLink(userId)));
}

/** Approves the OpenCode device showing `rawCode`. The CLI then collects its own token. */
export async function approveDeviceLink(rawCode: string): Promise<Result<string>> {
  return asStudent(async (userId) => {
    if (seedstackConsentState(await getSeedstackConsent(userId)) !== "active") {
      throw new StudentError("ต้องยินยอมทั้งเราและผู้ปกครองก่อนนะ");
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

export async function submitParentDecision(input: {
  token: string;
  agree: boolean;
  parentName: string;
  relationship: string;
}): Promise<Result<null>> {
  const parentName = input.parentName.trim().slice(0, 120);
  if (!parentName) return { ok: false, error: "กรอกชื่อผู้ปกครองก่อนนะคะ" };
  if (!RELATIONSHIPS.has(input.relationship)) return { ok: false, error: "เลือกความเกี่ยวข้องกับน้องก่อนนะคะ" };

  try {
    const saved = await recordParentDecision({
      rawToken: input.token,
      agree: input.agree,
      parentName,
      relationship: input.relationship,
    });
    if (!saved) return { ok: false, error: "ลิงก์นี้หมดอายุแล้ว ให้น้องสร้างลิงก์ใหม่ส่งมาอีกครั้งค่ะ" };
    revalidatePath(`/shift/seedstack/parent/${input.token}`);
    return { ok: true, value: null };
  } catch (error) {
    console.error("[seedstack] parent decision failed:", error);
    return { ok: false, error: "ระบบขัดข้อง ลองใหม่อีกครั้ง หรือติดต่อทีมงานทาง LINE ค่ะ" };
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
    return { ok: false, error: "ระบบขัดข้อง ลองใหม่อีกครั้ง หรือติดต่อทีมงานทาง LINE ค่ะ" };
  }
}
