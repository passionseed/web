"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  addMeetingAction,
  replyAction,
  saveStandupAction,
  setMeetingHeldAction,
  setUnstuckAction,
} from "@/app/shift/alumni/board/actions";
import { formatBangkok, HELP_PROMPTS } from "@/lib/shift/alumniBoard";
import type { Meeting, Standup } from "@/lib/supabase/shift-alumni-board/team";

import board from "./board.module.css";
import { useBoardAction } from "./useBoardAction";

function HeldToggle({ meeting }: { meeting: Meeting }) {
  const { pending, run } = useBoardAction();
  return (
    <button
      type="button"
      className={`${board.ghost} ${board.small}`}
      aria-pressed={meeting.held}
      disabled={pending}
      onClick={() => run(() => setMeetingHeldAction(meeting.id, !meeting.held))}
    >
      {meeting.held ? "✅ เจอกันแล้ว" : "ยังไม่ได้เจอ"}
    </button>
  );
}

/** Replies under a stuck note, tap-in reflection questions, and (for its owner) "solved". */
function StuckThread({ standup, viewerId }: { standup: Standup; viewerId: string }) {
  const { pending, run } = useBoardAction();
  const [body, setBody] = useState("");
  const send = (prompt?: string) =>
    run(
      () => replyAction(standup.id, { prompt, body: prompt ? "" : body }),
      () => {
        if (!prompt) setBody("");
      },
    );
  return (
    <div id={`st-${standup.id}`} className={board.thread}>
      {standup.unstuck_at && <p className={board.solved}>✅ แก้ได้แล้ว</p>}
      {standup.replies.map((r) => (
        <p key={r.id} className="mt-2">
          <b>{r.name}</b> <span className={board.muted}>{formatBangkok(r.created_at)}</span>
          <br />
          <span className={board.pre}>{r.body}</span>
        </p>
      ))}
      <details className={`${board.details} mt-2`}>
        <summary>💬 ช่วยกันแก้{standup.replies.length ? ` (${standup.replies.length})` : ""}</summary>
        <p className={`${board.muted} mt-1`}>ไม่รู้จะตอบอะไร? แตะคำถามด้านล่างเพื่อส่งเลย ช่วยให้เพื่อนคิดเองได้</p>
        <div className={`${board.row} mt-2`}>
          {HELP_PROMPTS.map((q) => (
            <button key={q} type="button" className={board.chip} disabled={pending} onClick={() => send(q)}>
              {q}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <textarea
            aria-label="ตอบ"
            className={`${board.input} mt-3`}
            required
            maxLength={500}
            placeholder="ถามหรือแนะนำสั้น ๆ"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <button type="submit" className={`${board.button} ${board.small} mt-2`} disabled={pending}>
            ตอบ
          </button>
        </form>
      </details>
      {standup.user_id === viewerId && (
        <button
          type="button"
          className={`${board.ghost} ${board.small} mt-2`}
          disabled={pending}
          onClick={() => run(() => setUnstuckAction(standup.id, !standup.unstuck_at))}
        >
          {standup.unstuck_at ? "↩️ ยังไม่ได้แก้" : "✅ แก้ได้แล้ว"}
        </button>
      )}
    </div>
  );
}

function StandupForm({ meetingId, mine }: { meetingId: string; mine: Standup | undefined }) {
  const { pending, run } = useBoardAction();
  const [values, setValues] = useState({ done: mine?.done ?? "", next: mine?.next ?? "", stuck: mine?.stuck ?? "" });
  const fields = [
    { name: "done", label: "✅ ทำเสร็จแล้ว" },
    { name: "next", label: "👉 จะทำต่อ" },
    { name: "stuck", label: "🧱 ติดอยู่ที่" },
  ] as const;
  return (
    <details className={`${board.details} mt-2`}>
      <summary>standup ของเรา</summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => saveStandupAction(meetingId, values), () => toast.success("บันทึกแล้ว"));
        }}
      >
        {fields.map((f) => (
          <div key={f.name}>
            <label className={board.label} htmlFor={`${meetingId}-${f.name}`}>
              {f.label}
            </label>
            <textarea
              id={`${meetingId}-${f.name}`}
              className={board.input}
              maxLength={500}
              value={values[f.name]}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
            />
          </div>
        ))}
        <button type="submit" className={`${board.button} mt-3`} disabled={pending}>
          บันทึก
        </button>
      </form>
    </details>
  );
}

function MeetingItem({ meeting, viewerId, inTeam }: { meeting: Meeting; viewerId: string; inTeam: boolean }) {
  const mine = meeting.standups.find((s) => s.user_id === viewerId);
  return (
    <div className={board.divider}>
      <div className={board.row}>
        <b>{formatBangkok(meeting.starts_at)}</b>
        <HeldToggle meeting={meeting} />
      </div>
      {meeting.standups.map((s) => (
        <div key={s.id} className="mt-3">
          <p>
            <b>{s.name}</b>
          </p>
          {s.done && <p className={board.pre}>✅ {s.done}</p>}
          {s.next && <p className={board.pre}>👉 {s.next}</p>}
          {s.stuck && <p className={`${board.pre} ${board.stuck}`}>🧱 {s.stuck}</p>}
          {s.stuck && <StuckThread standup={s} viewerId={viewerId} />}
        </div>
      ))}
      {inTeam && <StandupForm key={mine?.id ?? "new"} meetingId={meeting.id} mine={mine} />}
    </div>
  );
}

function AddMeeting({ teamId }: { teamId: string }) {
  const { pending, run } = useBoardAction();
  const [startsAt, setStartsAt] = useState("");
  return (
    <form
      className="mt-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => addMeetingAction(teamId, startsAt), () => setStartsAt(""));
      }}
    >
      <label className={board.label} htmlFor="meeting-starts">
        เพิ่มนัด <span className={board.hint}>เวลาไทย</span>
      </label>
      <div className={board.row}>
        <input
          id="meeting-starts"
          type="datetime-local"
          className={`${board.input} max-w-xs`}
          required
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
        />
        <button type="submit" className={board.button} disabled={pending}>
          เพิ่มนัด
        </button>
      </div>
    </form>
  );
}

/** This round's team meetings, each with its standups and help threads. */
export function MeetingsCard({
  teamId,
  meetings,
  viewerId,
  inTeam,
}: {
  teamId: string;
  meetings: Meeting[];
  viewerId: string;
  inTeam: boolean;
}) {
  return (
    <section className={board.card}>
      <h2 className={board.subtitle}>นัดทำงานรอบนี้</h2>
      {meetings.length === 0 && <p className={`${board.muted} mt-1`}>ยังไม่มีนัด ลองตั้ง 3 ครั้งต่อสัปดาห์</p>}
      {meetings.map((m) => (
        <MeetingItem key={m.id} meeting={m} viewerId={viewerId} inTeam={inTeam} />
      ))}
      <AddMeeting teamId={teamId} />
    </section>
  );
}
