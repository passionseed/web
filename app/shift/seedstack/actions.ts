"use server";

import { revalidatePath } from "next/cache";

import { isAnonymousUser } from "@/lib/supabase/auth";
import { seedstackConsentState } from "@/lib/seedstack/consent";
import {
  findParentLinkTarget,
  getSeedstackConsent,
  mintSeedstackToken,
  recordParentDecision,
  recordStudentConsent,
  rotateParentLink,
  withdrawSeedstackConsent,
} from "@/lib/seedstack/server";
import { createClient } from "@/utils/supabase/server";

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://passionseed.org";
const parentUrl = (token: string) => `${SITE_URL}/shift/seedstack/parent/${token}`;

async function signedInUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user && !isAnonymousUser(data.user) ? data.user.id : null;
}

async function asStudent<T>(run: (userId: string) => Promise<T>): Promise<Result<T>> {
  const userId = await signedInUserId();
  if (!userId) return { ok: false, error: "เข้าสู่ระบบก่อนนะ" };
  try {
    const value = await run(userId);
    revalidatePath("/shift/seedstack");
    return { ok: true, value };
  } catch (error) {
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

export async function createCliToken(): Promise<Result<string>> {
  return asStudent(async (userId) => {
    if (seedstackConsentState(await getSeedstackConsent(userId)) !== "active") {
      throw new Error("consent not active");
    }
    return mintSeedstackToken(userId);
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
