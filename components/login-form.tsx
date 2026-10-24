"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { SiDiscord, SiGoogle } from "@icons-pack/react-simple-icons";

import { createClient } from "@/utils/supabase/client";
import space from "@/components/shift/next/shiftNext.module.css";
import styles from "@/components/auth/login.module.css";

type Provider = "discord" | "google";

/** Where the person is headed, shown so a redirect to login does not feel like a dead end. */
export type LoginContext = {
  tag: string;
  /** Lines of the heading. */
  title: string[];
  description: string;
  board?: { title: string; ownerName: string; memberCount: number; thumbnail: string | null };
};

export function LoginForm({ next = "/", context }: { next?: string; context?: LoginContext }) {
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState("");
  const supabase = createClient();
  const safeNext = next.startsWith("/") ? next : "/";

  function getRedirectTo() {
    // Keep development cookies and the existing OAuth allowlist compatible.
    const origin = window.location.origin
      .replace("://0.0.0.0", "://localhost")
      .replace("://[::]", "://localhost");
    const callbackUrl = new URL("/auth/callback", origin);
    callbackUrl.searchParams.set("next", safeNext);
    return callbackUrl.toString();
  }

  async function signIn(provider: Provider) {
    if (pending) return;
    setPending(provider);
    setError("");
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: getRedirectTo() },
      });
      if (authError) throw authError;
    } catch {
      setError("เข้าสู่ระบบไม่สำเร็จ ลองอีกครั้งได้เลย");
      setPending(null);
    }
  }

  return (
    <section className={styles.copy} aria-labelledby="login-title">
      <p className={space.missionTag}>
        <span className={space.liveDot} aria-hidden="true" />
        {context?.tag ?? "Your next chapter"}
      </p>
      {context?.board ? (
        <BoardInvite board={context.board} />
      ) : (
        <p className={`${styles.brand} ${space.wordmarkText}`}>PassionSeed</p>
      )}
      {context ? (
        <>
          <h1 id="login-title" className={styles.title}>
            {context.title.map((line, i) => (
              <span key={line}>
                {i > 0 && <br />}
                {line}
              </span>
            ))}
          </h1>
          <p className={styles.description}>{context.description}</p>
        </>
      ) : (
        <>
          <h1 id="login-title" className={styles.title}>เข้าสู่ระบบ<br />แล้วไปสร้างต่อ</h1>
          <p className={styles.description}>เลือกบัญชีที่ใช้ แล้วกลับไปที่โปรเจกต์ของเรา<br />เพิ่งมาครั้งแรก? เริ่มด้วยบัญชีเดียวกันได้เลย</p>
        </>
      )}

      <div className={styles.providers} aria-busy={pending !== null}>
        <button type="button" className={space.cta} onClick={() => void signIn("google")} disabled={pending !== null}>
          {pending === "google" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <SiGoogle aria-hidden="true" />}
          <span>{pending === "google" ? "กำลังไปที่ Google…" : "เข้าสู่ระบบด้วย Google"}</span>
          <ArrowUpRight className={styles.arrow} aria-hidden="true" />
        </button>
        <button type="button" className={space.ghost} onClick={() => void signIn("discord")} disabled={pending !== null}>
          {pending === "discord" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <SiDiscord aria-hidden="true" />}
          <span>{pending === "discord" ? "กำลังไปที่ Discord…" : "เข้าสู่ระบบด้วย Discord"}</span>
          <ArrowUpRight className={styles.arrow} aria-hidden="true" />
        </button>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <Link href="/forgot-password" className={styles.help}>ลืมรหัสผ่าน?</Link>
      <p className={styles.terms}>
        เมื่อเข้าสู่ระบบ ถือว่าคุณยอมรับ<br />
        <Link href="/terms">ข้อกำหนดการใช้งาน</Link> และ <Link href="/privacy">นโยบายความเป็นส่วนตัว</Link>
      </p>
    </section>
  );
}

function BoardInvite({ board }: { board: NonNullable<LoginContext["board"]> }) {
  return (
    <div className={styles.board}>
      <div className={styles.boardPreview}>
        {board.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={board.thumbnail} alt="" />
        ) : (
          <span className={styles.boardStickies} aria-hidden="true">
            <i style={{ background: "#ffe680" }} />
            <i style={{ background: "#ffb3d1" }} />
            <i style={{ background: "#a8d8ff" }} />
          </span>
        )}
      </div>
      <div className={styles.boardMeta}>
        <p className={styles.boardTitle}>{board.title}</p>
        <p className={styles.boardBy}>
          {board.ownerName} ชวนมาวาดด้วยกัน · {board.memberCount} คนในบอร์ด
        </p>
      </div>
    </div>
  );
}
