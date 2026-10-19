"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check } from "lucide-react";

import { ChoiceChips, INPUT } from "@/components/shift/form/ShiftQuestion";
import { INK } from "@/components/shift/poster/riso";
import { RSVP_COHORTS, RSVP_NOTICE, rsvpCountLabel } from "@/lib/shift/alumniRsvp";

/**
 * "ไปด้วย" for the next alumni session: open from the start, no login, as
 * few taps as possible. The round comes from the group's link (?round=1),
 * and the device remembers who you are, so next week is one tap.
 */

const paper = (alpha: string) => `${INK.paper}${alpha}`;
export const doneKey = (date: string) => `shift-alumni-rsvp:${date}`;
const ME_KEY = "shift-alumni-me";
/** Fired on success so the sticky bar can step aside. */
export const RSVP_DONE_EVENT = "shift-alumni-rsvp-done";
export const RSVP_ANCHOR = "rsvp";

type Me = { nickname: string; cohort: string };
/** "known": this device already knows the nickname and round. */
type Mode = "form" | "known" | "done";

const knownCohort = (value: string) => RSVP_COHORTS.some((c) => c.value === value);

function readMe(): Me | null {
  try {
    const me = JSON.parse(window.localStorage.getItem(ME_KEY) ?? "null") as Me | null;
    return me?.nickname && knownCohort(me.cohort) ? me : null;
  } catch {
    return null;
  }
}

/** ?round=1 on the group's link picks SHIFT[1]. */
function cohortFromLink(): string {
  const round = new URLSearchParams(window.location.search).get("round");
  const cohort = round !== null ? `SHIFT[${round}]` : "";
  return knownCohort(cohort) ? cohort : "";
}

function Done({ nickname, count }: { nickname: string; count: number }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: INK.yellow, color: INK.black }}
      >
        <Check className="h-5 w-5" strokeWidth={3} />
      </span>
      <div>
        <p className="font-kodchasan text-lg font-semibold">ลงชื่อแล้ว เจอกันนะ {nickname}</p>
        {count > 0 && (
          <p className="text-sm" style={{ color: paper("99") }}>
            {rsvpCountLabel(count)}
          </p>
        )}
      </div>
    </div>
  );
}

export function AlumniRsvp({ date, initialCount }: { date: string; initialCount: number }) {
  const [mode, setMode] = useState<Mode>("form");
  const [sending, setSending] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [nickname, setNickname] = useState("");
  const [cohort, setCohort] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const nicknameInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const me = readMe();
    const done = window.localStorage.getItem(doneKey(date));
    if (done) {
      setNickname(done);
      setMode("done");
      return;
    }
    if (me) {
      setNickname(me.nickname);
      setCohort(me.cohort);
      setMode("known");
      return;
    }
    setCohort(cohortFromLink());
  }, [date]);

  async function send() {
    if (!nickname.trim()) {
      setError("ใส่ชื่อเล่นก่อนนะ");
      nicknameInput.current?.focus();
      return;
    }
    if (!cohort) return setError("เลือกรุ่นด้วยนะ");

    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/shift/alumni/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, nickname, cohort, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "ส่งไม่สำเร็จ ลองอีกทีนะ");
        return;
      }
      if (data.result === "added") setCount((n) => n + 1);
      window.localStorage.setItem(doneKey(date), nickname.trim());
      window.localStorage.setItem(ME_KEY, JSON.stringify({ nickname: nickname.trim(), cohort }));
      window.dispatchEvent(new Event(RSVP_DONE_EVENT));
      setMode("done");
    } catch {
      setError("ส่งไม่สำเร็จ ลองอีกทีนะ");
    } finally {
      setSending(false);
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void send();
  };

  if (mode === "done") return <Done nickname={nickname} count={count} />;

  const errorLine = error && (
    <p className="text-sm font-semibold" style={{ color: INK.pink }} role="alert">
      {error}
    </p>
  );

  if (mode === "known") {
    return (
      <div className="space-y-3">
        <button type="button" onClick={() => void send()} disabled={sending} className="shift-button w-full sm:w-auto">
          <span>{sending ? "กำลังส่ง..." : `ไปด้วย ในชื่อ ${nickname} · ${cohort}`}</span>
        </button>
        {errorLine}
        <p className="text-sm" style={{ color: paper("99") }}>
          {rsvpCountLabel(count)} ·{" "}
          <button type="button" onClick={() => setMode("form")} className="underline underline-offset-4">
            ไม่ใช่เรา?
          </button>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <input
        ref={nicknameInput}
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        maxLength={30}
        placeholder="ชื่อเล่นของเรา"
        autoComplete="nickname"
        enterKeyHint="send"
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
      {errorLine}
      <button type="submit" disabled={sending} className="shift-button w-full sm:w-auto">
        <span>{sending ? "กำลังส่ง..." : "ไปด้วย 🙋"}</span>
      </button>
      <p className="text-sm" style={{ color: paper("99") }}>
        {rsvpCountLabel(count)}
      </p>
      <p className="text-xs leading-relaxed" style={{ color: paper("66") }}>
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
