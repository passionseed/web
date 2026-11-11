"use client";

import { useMemo, useRef, useState } from "react";

import type { IslandHotspot, IslandPicture } from "@/lib/shift-island/picture";
import { keynoteQuest, starterQuest, type BoardRef } from "@/lib/supabase/shift-quests/board";
import type { IslandPageData } from "@/lib/supabase/shift-quests/types";

import { CanvasLinkSheet } from "./canvas";
import { GATE, HUD, NO_PROJECT } from "./copy";
import { BoardSheet, InboxSheet, MenuSheet, ProjectSheet } from "./HudSheets";
import { GateCard } from "./IslandGate";
import { BoardButton, Hud, HudChip, HudLabel, HudRound, hudRoundClass } from "./IslandHud";
import styles from "./island.module.css";
import { IslandSheet } from "./IslandSheet";
import { IslandViewport } from "./IslandViewport";
import { KeynoteCard } from "./KeynoteCard";
import { NoProject } from "./NoProject";
import { PlotSheet } from "./PlotSheet";
import { ProposeSheet } from "./ProposeSheet";
import { QuestBoard } from "./QuestBoard";
import { QuestDetailSheet } from "./QuestDetailSheet";
import { StoryLauncher } from "./story/StoryLauncher";
import { StuckSheet, type StuckTarget } from "./StuckSheet";
import { TodayCard } from "./TodayCard";
import world from "./world.module.css";

interface IslandAppProps {
  /** Shaped by getIslandPage: never the Discord id or the session. */
  page: IslandPageData;
  picture: IslandPicture | null;
}

/** The sheets opened from the HUD itself; at most one at a time. */
type Panel = "board" | "project" | "menu" | "inbox" | null;

/**
 * The island for a student who has started, as a full-screen game: the
 * living island edge to edge, a minimal HUD over it, and every other screen
 * (board, quest, stuck, propose, canvas link, claim) as a sheet over the
 * island, which stays in view, dimmed and still, behind it.
 */
export function IslandApp({ page, picture }: IslandAppProps) {
  const project = page.island.project;
  const demoDay = page.island.season?.demo_day ?? null;
  if (!project) {
    return <Unclaimed page={page} picture={picture} demoDay={demoDay} />;
  }
  if (!page.board) {
    return <GateCard heading={GATE.unavailable.heading} body={GATE.unavailable.body} />;
  }
  return <IslandHome page={page} board={page.board} project={project} picture={picture} />;
}

/** No project yet: the island to look at, and one action, claiming a plot (or answering an invite). */
function Unclaimed({ page, picture, demoDay }: IslandAppProps & { demoDay: string | null }) {
  const [storyOpen, setStoryOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [menu, setMenu] = useState(false);
  const [whole, setWhole] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const invites = page.invites.length;

  return (
    <>
      <IslandViewport picture={picture} interactive={false} paused={storyOpen || claiming || menu} whole={whole} />
      <Hud
        chip={<HudLabel text={HUD.noPlot} />}
        buttons={
          <>
            <StoryLauncher
              demoDay={demoDay}
              cta="claim"
              onCta={() => setClaiming(true)}
              onOpenChange={setStoryOpen}
              className={hudRoundClass}
            />
            <HudRound icon="menu" label={HUD.menu} onClick={() => setMenu(true)} />
          </>
        }
        bottom={
          <button type="button" className={`ei-button-dawn ${styles.primary} ${world.claim}`} onClick={() => setClaiming(true)} aria-haspopup="dialog">
            <span>{invites > 0 ? HUD.invites(invites) : NO_PROJECT.action}</span>
          </button>
        }
      />
      <IslandSheet
        open={claiming}
        onOpenChange={setClaiming}
        title={NO_PROJECT.heading}
        onOpenAutoFocus={(event) => {
          // Straight to the name field: the story's "จับจองที่ดิน" and the button both mean "start typing".
          event.preventDefault();
          nameInput.current?.focus({ preventScroll: true });
        }}
      >
        <NoProject invites={page.invites} nameInput={nameInput} />
      </IslandSheet>
      <MenuSheet
        open={menu}
        onClose={() => setMenu(false)}
        me={page.me}
        project={null}
        whole={whole}
        onToggleWhole={() => {
          setWhole((current) => !current);
          setMenu(false);
        }}
      />
    </>
  );
}

function IslandHome({
  page,
  board,
  project,
  picture,
}: IslandAppProps & {
  board: NonNullable<IslandPageData["board"]>;
  project: NonNullable<IslandPageData["island"]["project"]>;
}) {
  const keynote = useMemo(() => keynoteQuest(board), [board]);
  const hasAction = useMemo(() => (keynote ?? starterQuest(board)) != null, [keynote, board]);
  const [panel, setPanel] = useState<Panel>(null);
  const [detail, setDetail] = useState<BoardRef | null>(null);
  // A quest opened from the board goes back to the board when it closes.
  const [detailFromBoard, setDetailFromBoard] = useState(false);
  const [stuck, setStuck] = useState<{ open: boolean; target: StuckTarget }>({
    open: false,
    target: { instanceId: null, title: null },
  });
  const [proposing, setProposing] = useState(false);
  const [plot, setPlot] = useState<IslandHotspot | null>(null);
  const [puffKey, setPuffKey] = useState(0);
  // The canvas picker, opened from a quest; the quest reopens once a canvas is linked.
  const [linking, setLinking] = useState(false);
  const [relinkRef, setRelinkRef] = useState<BoardRef | null>(null);
  const [storyOpen, setStoryOpen] = useState(false);
  const [whole, setWhole] = useState(false);
  const season = page.island.season;
  const goal = season?.goal ?? page.map.goal ?? null;
  // Any sheet or the story over the island stops its animation: nobody is looking at it.
  const paused = panel != null || detail != null || stuck.open || proposing || plot != null || linking || storyOpen;

  /** A quest, from the bottom bar (back to the world on close) or from the board (back to the board). */
  function openQuest(ref: BoardRef, fromBoard: boolean) {
    setPanel(null);
    setDetailFromBoard(fromBoard);
    setDetail(ref);
  }

  function closeQuest() {
    setDetail(null);
    if (detailFromBoard) setPanel("board");
    setDetailFromBoard(false);
  }

  /** From the student's own plot: the plot sheet gives way to the quest board. */
  function showBoard() {
    setPlot(null);
    setPanel("board");
  }

  function openStuck(target: StuckTarget) {
    setPanel(null);
    setDetail(null);
    setDetailFromBoard(false);
    setStuck({ open: true, target });
  }

  function openPropose() {
    setPanel(null);
    setProposing(true);
  }

  /** From a quest's "เชื่อมแคนวาส" or "เลือกใหม่": swap the quest sheet for the canvas picker. */
  function openLinking(ref: BoardRef) {
    setRelinkRef(ref);
    setDetail(null);
    setLinking(true);
  }

  /** Picker done (linked or dismissed): back to the quest it was opened from. */
  function closeLinking() {
    setLinking(false);
    if (relinkRef) setDetail(relinkRef);
    setRelinkRef(null);
  }

  return (
    <>
      <IslandViewport picture={picture} puffKey={puffKey} onPlot={setPlot} paused={paused} whole={whole} />
      <Hud
        chip={<HudChip name={project.name} stage={project.stage} onOpen={() => setPanel("project")} />}
        buttons={
          <>
            <StoryLauncher demoDay={season?.demo_day ?? null} cta="island" onOpenChange={setStoryOpen} className={hudRoundClass} />
            {page.unread > 0 ? (
              <HudRound icon="mail" label={HUD.inbox(page.unread)} badge={page.unread} onClick={() => setPanel("inbox")} />
            ) : null}
            <HudRound icon="menu" label={HUD.menu} onClick={() => setPanel("menu")} />
          </>
        }
        bottom={
          <>
            {/* The keynote: the one gold element and the one main call to action. */}
            <KeynoteCard board={board} keynote={keynote} onOpen={(ref) => openQuest(ref, false)} />
            <BoardButton wide={!hasAction} onClick={() => setPanel("board")} />
          </>
        }
      />

      <BoardSheet open={panel === "board"} onClose={() => setPanel(null)}>
        <QuestBoard
          board={board}
          stage={project.stage}
          goal={goal}
          keynote={keynote}
          onOpen={(ref) => openQuest(ref, true)}
          onPropose={openPropose}
        />
      </BoardSheet>
      <ProjectSheet
        open={panel === "project"}
        onClose={() => setPanel(null)}
        project={project}
        season={season}
        today={
          <TodayCard
            tapsToday={page.island.taps_today}
            resting={page.island.resting}
            onTapped={() => setPuffKey((key) => key + 1)}
            onStuck={() => openStuck({ instanceId: null, title: null })}
          />
        }
      />
      <MenuSheet
        open={panel === "menu"}
        onClose={() => setPanel(null)}
        me={page.me}
        project={project}
        whole={whole}
        onToggleWhole={() => {
          setWhole((current) => !current);
          setPanel(null);
        }}
      />
      <InboxSheet open={panel === "inbox"} onClose={() => setPanel(null)} unread={page.unread} />

      <QuestDetailSheet
        board={board}
        target={detail}
        keynote={keynote}
        canvasLink={page.canvasLink}
        onClose={closeQuest}
        onStuck={openStuck}
        onLinkCanvas={openLinking}
      />
      <StuckSheet
        open={stuck.open}
        target={stuck.target}
        onClose={() => setStuck((current) => ({ ...current, open: false }))}
      />
      <ProposeSheet open={proposing} onClose={() => setProposing(false)} />
      <PlotSheet hotspot={plot} onClose={() => setPlot(null)} onBoard={showBoard} />
      <CanvasLinkSheet open={linking} link={page.canvasLink} onClose={closeLinking} onLinked={closeLinking} />
    </>
  );
}
