"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

import { EL } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import {
  inviteAsk,
  inviteDetail,
  inviteSeats,
  lineShareUrl,
  teamInviteMessage,
  teamInviteUrl,
  type InviteHow,
  type InviteSeat,
} from "@/lib/hackathon/elemental/team-invite";
import { teamLabel } from "@/lib/hackathon/elemental/team-name";

import shell from "./share/shell.module.css";
import { Fine, H2, PrimaryButton, SecondaryButton, Tag, TextInput, surfaceVars } from "./share/ui";
import { changeTeam } from "./TeamJoin";
import { trackElemental } from "./track";

/**
 * The first thing on a paid page, under "ได้ที่นั่งแล้ว": bring two friends
 * into your team, ฿149 each, with LINE as the main button (Big, 2026-11-28:
 * the bet for the sign-up push is that every payer brings 2 friends; a
 * friend's team link is the best channel there is, and all 28 paid sign-ups
 * so far are one seat each).
 *
 * - In a team with seats left: the team's seats, then LINE, the phone's
 *   share sheet and copy, all with the team's own invite link.
 * - No team yet: start one here (the same team change as on TeamJoin, until
 *   ELEMENTAL.teamChangeClosesAt); the page reloads into the invite.
 * PayView decides which, with paidInviteState (lib/hackathon/elemental/team-invite.ts).
 *
 * Every share fires invite_shared with "paid:<how>", so the admin funnel can
 * tell these from the team card's shares.
 */

/** The team as the page has it (PublicTeam's fields that the invite needs). */
type InviteTeam = { name: string; inviteCode: string; roster: { name: string; paid: boolean }[]; spotsLeft: number };

type Props = {
  token: string;
  team: InviteTeam | null;
  /** What starting a team does to this sign-up (its price, its buddy pass), one line each. */
  startNotes: string[];
  /** When team changes close, as shown: "5 ธ.ค. 10:00 น." */
  until: string;
  /** An unused buddy pass sits further down the page. */
  buddyPassAvailable?: boolean;
  demo?: boolean;
};

// PLACEHOLDER copy (Angpao): every Thai string in this file until Angpao rewrites it.

export function PaidInvite({ token, team: serverTeam, startNotes, until, buddyPassAvailable, demo }: Props) {
  // The demo starts a pretend team in place, since nothing is saved.
  const [demoTeam, setDemoTeam] = useState<InviteTeam | null>(null);
  const team = serverTeam ?? demoTeam;
  const seats = inviteSeats(team?.roster ?? null, ELEMENTAL.maxGroupSize);
  const ask = team ? inviteAsk(team.spotsLeft) : inviteAsk(ELEMENTAL.maxGroupSize - 1);

  return (
    <section
      aria-labelledby="paid-invite-title"
      className={`${shell.surface} space-y-5 rounded-[2px] p-5 sm:p-7`}
      style={{ ...surfaceVars("paper"), boxShadow: `inset 0 0 0 2px ${EL.ink}` }}
    >
      <H2 id="paid-invite-title">
        {/* PLACEHOLDER copy (Angpao) */}
        {/* Two pieces that each stay on one line, so a phone breaks between them, never inside "เข้าทีม". */}
        <span className="whitespace-nowrap">{team ? `ชวนเพื่อน ${ask} คนเข้าทีม` : `ชวนเพื่อน ${ask} คนมาเป็นทีม`}</span>{" "}
        <span className="whitespace-nowrap">คนละ ฿{ELEMENTAL.groupPriceBaht}</span>
      </H2>

      <div className="space-y-2.5">
        <Seats seats={seats} />
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p style={{ fontSize: 16, lineHeight: "26px" }}>
            {/* PLACEHOLDER copy (Angpao) */}
            {team ? `${teamLabel(team.name)} ตอนนี้ ${team.roster.length} คน` : "ตอนนี้คุณมาคนเดียว"}
          </p>
          <Tag>
            {team ? team.roster.length : 1}/{ELEMENTAL.maxGroupSize}
          </Tag>
        </div>
      </div>

      {team ? (
        <ShareLinks team={team} />
      ) : (
        <StartTeam
          token={token}
          notes={startNotes}
          until={until}
          demo={demo}
          onDemoCreated={(name) =>
            setDemoTeam({ name, inviteCode: "0123456789ab", roster: [{ name: "คุณ", paid: true }], spotsLeft: ELEMENTAL.maxGroupSize - 1 })
          }
        />
      )}

      {/* Without a team the start notes already cover the pass. */}
      {team && buddyPassAvailable && (
        // PLACEHOLDER copy (Angpao)
        <Fine>มีบัตรเพื่อนด้วย ส่งให้เพื่อน 1 คน จ่ายแค่ ฿{ELEMENTAL.buddyPriceBaht} ดูด้านล่าง</Fine>
      )}
    </section>
  );
}

const SEAT_STYLE: Record<InviteSeat, CSSProperties> = {
  paid: { backgroundColor: EL.ink },
  unpaid: { boxShadow: `inset 0 0 0 2px ${EL.ink}` },
  ask: { boxShadow: `inset 0 0 0 2px ${EL.flame}`, backgroundColor: "rgba(236,100,36,0.12)" },
  open: { backgroundColor: "rgba(29,33,31,0.08)" },
};

/** The team's seats as squares: filled for paid, outlined for not paid yet, flame for the friends asked for. */
function Seats({ seats }: { seats: InviteSeat[] }) {
  return (
    <div aria-hidden="true" className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${seats.length}, minmax(0, 1fr))` }}>
      {seats.map((seat, i) => (
        <span key={i} className="block h-10 rounded-[2px] sm:h-12" style={SEAT_STYLE[seat]} />
      ))}
    </div>
  );
}

/** Half-width buttons on a 390px phone: less side padding, so "คัดลอกลิงก์" stays on one line. */
const half = "!px-3 whitespace-nowrap";

function ShareLinks({ team }: { team: InviteTeam }) {
  const [origin, setOrigin] = useState("https://passionseed.org");
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    setCanShare(typeof navigator.share === "function");
  }, []);

  const url = teamInviteUrl(origin, team.inviteCode);
  const message = teamInviteMessage(team.name, url);
  const track = (how: InviteHow) => trackElemental({ step: "invite_shared", detail: inviteDetail("paid", how) }, { once: false });

  const copy = async () => {
    track("copy");
    await navigator.clipboard.writeText(url).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <PrimaryButton href={lineShareUrl(message)} external onClick={() => track("line")} icon="chat" full>
        {/* PLACEHOLDER copy (Angpao) */}
        ส่งลิงก์ใน LINE
      </PrimaryButton>
      <div className={`grid gap-2 ${canShare ? "grid-cols-2" : "grid-cols-1"}`}>
        {canShare && (
          <SecondaryButton
            icon="share"
            className={half}
            onClick={() => {
              track("share");
              navigator.share({ text: message }).catch(() => undefined);
            }}
          >
            {/* PLACEHOLDER copy (Angpao) */}
            แชร์
          </SecondaryButton>
        )}
        <SecondaryButton icon={copied ? "check" : "copy"} onClick={copy} className={half}>
          {/* PLACEHOLDER copy (Angpao) */}
          <span aria-live="polite">{copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}</span>
        </SecondaryButton>
      </div>
      <Fine>
        {/* PLACEHOLDER copy (Angpao) */}
        เพื่อนสมัครจากลิงก์นี้ ได้เข้าทีมเดียวกับคุณ แต่ละคนจ่ายเอง
      </Fine>
    </div>
  );
}

/** No team yet: name one and start it, then the page shows the invite. */
function StartTeam({
  token,
  notes,
  until,
  demo,
  onDemoCreated,
}: {
  token: string;
  notes: string[];
  until: string;
  demo?: boolean;
  onDemoCreated: (name: string) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    const next = name.trim();
    // PLACEHOLDER copy (Angpao)
    if (!next) return setError("ใส่ชื่อทีมก่อน");
    setBusy(true);
    setError(null);
    // The server checks the name (rude words) and the deadline, as for TeamJoin.
    const failed = await changeTeam(token, { action: "create", name: next }, demo);
    setBusy(false);
    if (failed) return setError(failed);
    if (demo) return onDemoCreated(next);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <TextInput
        id="paid-invite-team-name"
        // PLACEHOLDER copy (Angpao)
        label="ตั้งชื่อทีม แล้วได้ลิงก์ส่งให้เพื่อน"
        placeholder="ชื่อทีม"
        value={name}
        maxLength={80}
        error={error}
        onChange={(e) => {
          setName(e.target.value);
          setError(null);
        }}
      />
      <PrimaryButton type="submit" disabled={busy} full>
        {/* PLACEHOLDER copy (Angpao) */}
        {busy ? "กำลังสร้างทีม" : "สร้างทีม"}
      </PrimaryButton>
      <div className="space-y-1">
        {notes.map((note) => (
          <Fine key={note}>{note}</Fine>
        ))}
        {/* PLACEHOLDER copy (Angpao) */}
        <Fine>
          สร้างทีมได้ถึง <span className="whitespace-nowrap">{until}</span>
        </Fine>
      </div>
    </form>
  );
}

