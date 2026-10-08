"use server";

import { revalidatePath } from "next/cache";

import { isAnonymousUser } from "@/lib/supabase/auth";
import { seedstackConsentState } from "@/lib/seedstack/consent";
import { normalizeUserCode } from "@/lib/seedstack/link";
import {
  approveLinkRequest,
  findShiftStudent,
  getSeedstackConsent,
  recordStudentConsent,
  withdrawSeedstackConsent,
} from "@/lib/seedstack/server";
import { createClient } from "@/utils/supabase/server";

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

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

export async function giveStudentConsent(): Promise<Result<null>> {
  return asStudent(async (userId) => {
    await recordStudentConsent(userId);
    return null;
  });
}

/** Approves the OpenCode device showing `rawCode`. The CLI then collects its own token. */
export async function approveDeviceLink(rawCode: string): Promise<Result<string>> {
  return asStudent(async (userId) => {
    if (seedstackConsentState(await getSeedstackConsent(userId)) !== "active") {
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
