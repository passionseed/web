import type { Metadata } from "next";
import { ShiftNextCosmos, ShiftNextHero } from "@/components/shift/next/ShiftNextHero";
import { ShiftTopBar } from "@/components/shift/ShiftTopBar";
import space from "@/components/shift/next/shiftNext.module.css";
import styles from "@/components/auth/login.module.css";
import { LoginForm, type LoginContext } from "@/components/login-form";
import { previewByToken } from "@/lib/supabase/whiteboards";
import { isAnonymousUser } from "@/lib/supabase/auth";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import {
  isProfileComplete,
  PROFILE_COMPLETION_SELECT,
} from "@/lib/profile-completion";
import { isShiftPath } from "@/lib/shift/joinLink";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ | PassionSeed",
  description: "เข้าสู่ PassionSeed ด้วยบัญชี Google หรือ Discord แล้วกลับไปสร้างโปรเจกต์และเรียนรู้ต่อ",
};

export const dynamic = "force-dynamic";

/** Whiteboard links land here when signed out; say so, and show the board for share links. */
async function loginContext(next: string): Promise<LoginContext | undefined> {
  if (next === "/calendar" || next.startsWith("/calendar?")) {
    return {
      tag: "Community calendar",
      title: ["เข้าสู่ระบบ", "แล้วดูนัดของเพื่อน"],
      description: "เข้าสู่ระบบแล้วจะพากลับไปที่นัดนี้ทันที กด \"ไปด้วย\" ให้เพื่อนรู้ว่าเราจะมา ครั้งแรกก็ใช้ปุ่มเดียวกันได้เลย",
    };
  }
  if (next !== "/whiteboard" && !next.startsWith("/whiteboard/")) return undefined;
  const token = next.match(/^\/whiteboard\/join\/([0-9a-f]{32})/)?.[1];
  const board = token ? await previewByToken(token).catch(() => null) : null;
  if (board) {
    return {
      tag: "Whiteboard invite",
      title: ["เข้าสู่ระบบ", "แล้วเข้าบอร์ดเลย"],
      description: "ใช้บัญชี Google หรือ Discord แล้วจะพาเข้าบอร์ดนี้ทันที ครั้งแรกก็ใช้ปุ่มเดียวกันได้เลย ไม่ต้องสมัครแยก",
      board,
    };
  }
  return {
    tag: "Whiteboard",
    title: ["เข้าสู่ระบบ", "เพื่อเปิดไวท์บอร์ด"],
    description: "บอร์ดเปิดให้เฉพาะสมาชิก PassionSeed เข้าสู่ระบบแล้วจะพากลับไปที่บอร์ดทันที ครั้งแรกก็ใช้ปุ่มเดียวกันได้เลย",
  };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = params?.next?.startsWith("/") ? params.next : "/me";
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user && !isAnonymousUser(data.user)) {
    // SHIFT students sign up through Discord and never onboard.
    if (isShiftPath(next)) redirect(next);
    // Check if profile is complete before redirecting
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select(`${PROFILE_COMPLETION_SELECT}, is_onboarded`)
      .eq("id", data.user.id)
      .single();
    const { data: guardianConsent } = await supabase
      .from("profile_guardian_consents")
      .select("guardian_phone, guardian_relationship, consent_confirmed_at")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (
      profileError ||
      !isProfileComplete(profileData, guardianConsent) ||
      !profileData.is_onboarded
    ) {
      redirect(
        next === "/me" ? "/onboard" : `/onboard?next=${encodeURIComponent(next)}`
      );
    }

    redirect(next);
  }

  return (
    <div className={`${space.page} ${styles.scene} font-bai-jamjuree antialiased`} lang="th">
      <ShiftNextCosmos />
      <ShiftNextHero>
        <ShiftTopBar back={{ href: "/", label: "กลับหน้าแรก" }} />
        <div className={styles.scrim} aria-hidden="true" />
        <div className={`${space.container} ${styles.inner}`}>
          <LoginForm next={next} context={await loginContext(next)} />
        </div>
      </ShiftNextHero>
    </div>
  );
}
