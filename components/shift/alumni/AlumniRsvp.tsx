"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check } from "lucide-react";

import { ChoiceChips, INPUT } from "@/components/shift/form/ShiftQuestion";
import { INK } from "@/components/shift/poster/riso";
import { RSVP_COHORTS, RSVP_NOTICE, rsvpCountLabel } from "@/lib/shift/alumniRsvp";

/**
 * "ไปด้วย" on the next alumni session: nickname and round, no login. The
 * device remembers the RSVP so a reload shows it as done.
 */

const paper = (alpha: string) => `${INK.paper}${alpha}`;
const storageKey = (date: string) => `shift-alumni-rsvp:${date}`;

type Status = "idle" | "open" | "sending" | "done" | "error";

export function AlumniRsvp({ date, initialCount }: { date: string; initialCount: number }) {
  const [status, setStatus] = useState<Status>("idle");
  const [count, setCount] = useState(initialCount);
  const [nickname, setNickname] = useState("");
  const [cohort, setCohort] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey(date));
    if (saved) {
      setNickname(saved);
      setStatus("done");
    }
  }, [date]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!nickname.trim()) return setError("ใส่ชื่อเล่นด้วยนะ");
    if (!cohort) return setError("เลือกรุ่นด้วยนะ");

    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/shift/alumni/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, nickname, cohort, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "ส่งไม่สำเร็จ ลองใหม่อีกครั้งนะ");
        setStatus("open");
        return;
      }
      if (data.result === "added") setCount((n) => n + 1);
      window.localStorage.setItem(storageKey(date), nickname.trim());
      setStatus("done");
    } catch {
      setError("ส่งไม่สำเร็จ ลองใหม่อีกครั้งนะ");
      setStatus("open");
    }
  }

  const countLine = (
    <p className="text-sm" style={{ color: paper("99") }}>
      {rsvpCountLabel(count)}
    </p>
  );

  if (status === "done") {
    return (
      <div className="mt-5 flex items-center gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: INK.yellow, color: INK.black }}
        >
          <Check className="h-4 w-4" strokeWidth={3} />
        </span>
        <div>
          <p className="font-kodchasan font-semibold">ลงชื่อแล้ว เจอกันนะ {nickname}</p>
          {count > 0 && countLine}
        </div>
      </div>
    );
  }

  if (status === "idle") {
    return (
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button type="button" onClick={() => setStatus("open")} className="shift-button">
          <span>ไปด้วย</span>
        </button>
        {countLine}
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mt-5 space-y-4">
      <input
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        maxLength={30}
        placeholder="ชื่อเล่น"
        autoComplete="nickname"
        aria-label="ชื่อเล่น"
        className={INPUT}
        style={{ borderColor: paper("33"), color: INK.paper }}
      />
      <ChoiceChips name="รุ่น" options={RSVP_COHORTS} value={cohort} onChange={setCohort} />
      {/* Honeypot: hidden from people, visible to naive bots */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
        aria-hidden="true"
      />
      {error && (
        <p className="text-sm font-semibold" style={{ color: INK.pink }} role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button type="submit" disabled={status === "sending"} className="shift-button">
          <span>{status === "sending" ? "กำลังส่ง..." : "ยืนยัน ไปด้วย"}</span>
        </button>
        {countLine}
      </div>
      <p className="text-xs leading-relaxed" style={{ color: paper("80") }}>
        {RSVP_NOTICE}
      </p>
    </form>
  );
}

/** Who said yes, for admins only. The server never sends names to anyone else. */
export function AlumniRsvpNames({ rsvps }: { rsvps: { nickname: string; cohort: string }[] }) {
  return (
    <div className="mt-4 rounded-lg p-3 text-sm" style={{ boxShadow: `inset 0 0 0 1px ${INK.yellow}66` }}>
      <p className="text-xs font-semibold" style={{ color: INK.yellow }}>
        ใครลงชื่อ (เห็นเฉพาะแอดมิน)
      </p>
      <p className="mt-1 leading-relaxed" style={{ color: paper("cc") }}>
        {rsvps.length === 0 ? "ยังไม่มี" : rsvps.map((r) => `${r.nickname} (${r.cohort})`).join(", ")}
      </p>
    </div>
  );
}
