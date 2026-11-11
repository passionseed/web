import type { ReactNode } from "react";
import type { Metadata } from "next";

import { PdpaNotice } from "@/components/shift/consent/PdpaNotice";
import { ISLAND_PARENT } from "@/components/shift/island/consent/copy";
import { IslandParentForm, type IslandParentDecision } from "@/components/shift/island/consent/IslandParentForm";
import { Body, LineHelp } from "@/components/shift/join/ShiftJoinView";
import { RisoBand, RisoPageTexture } from "@/components/shift/ShiftRiso";
import { ShiftTopBar } from "@/components/shift/ShiftTopBar";
import { INK } from "@/components/shift/poster/riso";
import { sha256Hex } from "@/lib/seedstack/tokens";
import { ISLAND_NOTICE } from "@/lib/shift-island/consent/notice";
import {
  consentFailureCode,
  isParentLinkToken,
  parseParentView,
  type ParentLinkView,
} from "@/lib/supabase/shift-quests/consent";
import { questApi } from "@/lib/supabase/shift-quests/db";

/**
 * /shift/island/parent/{token}: the parent's consent page for SHIFT High
 * Island. Public (no account): the link token is the credential, only its
 * sha256 is stored, and the page shows nothing about the student except the
 * nickname they typed. Read through the web role at request time, never at
 * build time.
 */

// Every view reads one link's live state; nothing here can be prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: ISLAND_PARENT.metaTitle,
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

type Loaded = { kind: "view"; view: ParentLinkView | null } | { kind: "unavailable" };

async function loadView(token: string): Promise<Loaded> {
  if (!isParentLinkToken(token)) return { kind: "view", view: null };
  try {
    const raw = await questApi().call<unknown>("shift_quest_consent_parent_view", sha256Hex(token));
    return { kind: "view", view: raw === null || raw === undefined ? null : parseParentView(raw) };
  } catch (error) {
    console.error(`[shift-island] parent view failed: ${consentFailureCode(error)}`);
    return { kind: "unavailable" };
  }
}

/** The SHIFT flow's riso page, without an eyebrow line. */
function ParentShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      className="relative min-h-screen font-bai-jamjuree antialiased"
      style={{ backgroundColor: INK.black, color: INK.paper }}
      lang="th"
    >
      <RisoPageTexture />
      <ShiftTopBar />
      <RisoBand>
        <div className="mx-auto max-w-md px-6">
          <h1 className="text-balance font-kodchasan text-[28px] font-bold leading-snug sm:text-[32px]">{title}</h1>
        </div>
      </RisoBand>
      <main className="relative mx-auto max-w-md space-y-6 px-6 pb-20 pt-7">{children}</main>
    </div>
  );
}

function Notice() {
  return <PdpaNotice notice={ISLAND_NOTICE} variant="full" />;
}

function decisionOf(view: ParentLinkView): IslandParentDecision | null {
  // An AI-line link for a student who already has consent: the form asks.
  if (view.aiOnly && view.answerable) return null;
  if (view.state === "granted") return "agreed";
  if (view.state === "withdrawn") return "withdrawn";
  if (view.state === "declined") return "declined";
  return null;
}

export default async function IslandParentPage({ params }: PageProps) {
  const { token } = await params;
  const loaded = await loadView(token);

  if (loaded.kind === "unavailable") {
    return (
      <ParentShell title={ISLAND_PARENT.unavailable.title}>
        <Body>{ISLAND_PARENT.unavailable.body}</Body>
        <LineHelp />
      </ParentShell>
    );
  }

  const view = loaded.view;
  if (!view) {
    return (
      <ParentShell title={ISLAND_PARENT.dead.title}>
        <Body>{ISLAND_PARENT.dead.body}</Body>
        <LineHelp />
      </ParentShell>
    );
  }

  const who = view.studentLabel || ISLAND_PARENT.fallbackName;
  const live = view.answerable || view.withdrawable || view.state === "withdrawn";

  if (!live) {
    // Granted another way (the student confirmed their own age, or SHIFT), or a waiting/declined link past its date.
    const settled = view.state === "granted";
    return (
      <ParentShell title={settled ? ISLAND_PARENT.settled.title : ISLAND_PARENT.expired.title}>
        <Body>{settled ? ISLAND_PARENT.settled.body(who) : ISLAND_PARENT.expired.body(who)}</Body>
        <LineHelp />
      </ParentShell>
    );
  }

  const aiOnly = view.aiOnly && view.answerable;
  return (
    <ParentShell title={aiOnly ? ISLAND_PARENT.aiOnly.title(who) : ISLAND_PARENT.title(who)}>
      <IslandParentForm token={token} decision={decisionOf(view)} nickname={who} aiOnly={aiOnly}>
        <Body>{ISLAND_PARENT.intro(who)}</Body>
        <Body>{aiOnly ? ISLAND_PARENT.aiOnly.why(who) : ISLAND_PARENT.why(who)}</Body>
        <Notice />
      </IslandParentForm>
      <LineHelp />
    </ParentShell>
  );
}
