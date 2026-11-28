"use client";

import { useEffect, useState } from "react";

import { formatTeamCode } from "@/lib/hackathon/elemental/team-change";
import { teamLabel } from "@/lib/hackathon/elemental/team-name";

import { rememberedPageToken } from "../RememberMyPage";
import { EditorialLink, PrimaryButton, SecondaryButton, TextInput, v } from "../share/ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * On a friend's team link, for someone who has already signed up (alone at
 * ฿199, or in another team at ฿149): go to their own page with this team
 * ready to join or move to, instead of signing up and paying again (Big,
 * 2026-11-28). On the phone that opened their page before, one button; on
 * any other device, their page link by email, which only ever goes to the
 * address the sign-up was made with.
 */
export function AlreadySignedUp({ team, demo }: { team: { name: string; inviteCode: string }; demo?: boolean }) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setToken(rememberedPageToken()), []);

  const label = teamLabel(team.name);
  // Not a <form>: this sits inside the sign-up form, and a nested form would submit (and reload) the outer one.
  const send = async () => {
    if (!EMAIL_RE.test(email.trim())) return setError("ใส่อีเมลที่ใช้สมัคร");
    setError(null);
    setState("sending");
    if (demo) return setState("sent");
    try {
      const res = await fetch("/api/hackathon/elemental/my-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), team: team.inviteCode }),
      });
      if (res.status === 429) {
        setState("error");
        return setError("ขอลิงก์บ่อยไป รอสักครู่แล้วลองใหม่");
      }
      setState(res.ok ? "sent" : "error");
      if (!res.ok) setError("ส่งไม่สำเร็จ ลองอีกครั้ง");
    } catch {
      setState("error");
      setError("ส่งไม่สำเร็จ ลองอีกครั้ง");
    }
  };

  if (!open) {
    return (
      <div className="mt-4">
        <EditorialLink onClick={() => setOpen(true)}>สมัครไว้แล้ว? ย้ายเข้าทีมนี้โดยไม่ต้องสมัครใหม่</EditorialLink>
      </div>
    );
  }

  return (
    <section className="mt-6 space-y-5">
      <div className="space-y-1">
        <p style={{ fontSize: 18, lineHeight: "28px" }}>สมัครไว้แล้ว ไม่ต้องสมัครใหม่</p>
        <p style={{ color: v.secondary, fontSize: 15, lineHeight: "24px" }}>
          เข้า{label}จากหน้าของคุณเอง ค่าสมัครที่จ่ายแล้วไม่เปลี่ยน ถ้าอยู่ทีมอื่นอยู่ กดย้ายได้เลย
        </p>
      </div>

      {token && (
        <PrimaryButton href={`/hackathon/join/${token}?join=${team.inviteCode}`} full arrow>
          ไปหน้าของฉัน แล้วเข้า{label}
        </PrimaryButton>
      )}

      <div className="space-y-3">
        <TextInput
          id="el-my-page-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          label={token ? "ใช้เครื่องอื่นสมัคร? ส่งลิงก์หน้าของฉันไปที่อีเมล" : "ส่งลิงก์หน้าของฉันไปที่อีเมลที่ใช้สมัคร"}
          placeholder="อีเมลที่ใช้สมัคร"
          value={email}
          error={error ?? undefined}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
            if (state !== "sending") setState("idle");
          }}
          onKeyDown={(e) => {
            // Enter sends the email instead of moving the sign-up form on.
            if (e.key !== "Enter") return;
            e.preventDefault();
            void send();
          }}
        />
        <SecondaryButton type="button" onClick={() => void send()} full disabled={state === "sending"}>
          {state === "sending" ? "กำลังส่ง" : "ส่งลิงก์"}
        </SecondaryButton>
        {state === "sent" && (
          <p role="status" style={{ fontSize: 15, lineHeight: "24px" }}>
            ถ้าอีเมลนี้สมัครไว้ เราส่งลิงก์ไปแล้ว เปิดลิงก์ในอีเมล แล้วกดเข้า{label}ได้เลย (ดูในโฟลเดอร์สแปมด้วย)
          </p>
        )}
      </div>

      <p style={{ color: v.secondary, fontSize: 15, lineHeight: "24px" }}>
        หรือเปิดหน้าของคุณจากอีเมลตอนสมัคร แล้วใส่รหัสทีม{" "}
        <span className="whitespace-nowrap tabular-nums" style={{ color: v.text, letterSpacing: "0.06em" }}>
          {formatTeamCode(team.inviteCode)}
        </span>
      </p>
    </section>
  );
}
