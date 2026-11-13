"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CANVAS_ROUTE } from "@/lib/shift-island/canvas-link";
import { festivalOf, type Festival } from "@/lib/shift-island/festival";
import { MAX_SEATS, type PlazaInput, type PlazaLabelId, type PlazaSpotId } from "@/lib/shift-island/live/plaza";
import { noticePins, type NoticePin } from "@/lib/shift-island/notice";
import type { IslandHotspot, IslandPicture } from "@/lib/shift-island/picture";
import { keynoteQuest, starterQuest, type BoardRef } from "@/lib/supabase/shift-quests/board";
import type { LightPhase } from "@/lib/shift-island/live/types";
import type { CampfireSummary, IslandPageData } from "@/lib/supabase/shift-quests/types";

import { CampfireSheet } from "./CampfireSheet";
import { CanvasLinkSheet } from "./canvas";
import { ConsentSheet } from "./consent/ConsentSheet";
import { CAMPFIRE, CANVAS, FESTIVAL, GATE, HUD, NOTICE, NO_PROJECT, SEASON, thaiShortDate } from "./copy";
import { FestivalSheet } from "./FestivalSheet";
import { BoardSheet, InboxSheet, MenuSheet } from "./HudSheets";
import { NewsSheet } from "./news/NewsSheet";
import { CharacterSheet } from "./player/CharacterSheet";
import { CoinPill, showCoinPill } from "./player/CoinPill";
import { WalletSheet } from "./player/WalletSheet";
import { PRIZES_UI } from "./prizes/copy";
import { PrizeSheet } from "./prizes/PrizeSheet";
import { GateCard } from "./IslandGate";
import { BoardButton, Hud, HudChip, HudLabel, HudLinkRound, HudRound, hudRoundClass } from "./IslandHud";
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
import { useBangkokDay } from "./useBangkokDay";
import { useCampfire } from "./useCampfire";
import world from "./world.module.css";

interface IslandAppProps {
  /** Shaped by getIslandPage: never the Discord id or the session. */
  page: IslandPageData;
  picture: IslandPicture | null;
  /** Bangkok's light when the server rendered the page: the island is in it from the first paint. */
  initialPhase?: LightPhase;
  /** The SHIFT Discord server's URL (from the server's env), for the inbox's "open Discord". */
  discordUrl?: string | null;
  /** A sheet to open on arrival: "board" from the bot's 🌐 board link (`?at=board`). Only with a plot. */
  initialPanel?: "board";
}

/** About as long as a sheet takes to slide away (vaul's drawer is the slower one). */
const SHEET_CLOSE_MS = 450;

/**
 * The sheets opened from the HUD itself, the menu or the plaza; at most one
 * at a time. The chip opens "character" (which holds the old project sheet).
 */
type Panel =
  | "board"
  | "project"
  | "menu"
  | "inbox"
  | "festival"
  | "campfire"
  | "character"
  | "wallet"
  | "prizes"
  | "news"
  | "consent"
  | null;

/** The sheets a student without a plot can open: the menu and what it leads to, and the wallet. */
type UnclaimedPanel = Extract<Panel, "menu" | "wallet" | "prizes" | "news" | "consent"> | null;

/** The plaza in the world: what it draws, its labels and its tap targets (IslandViewport's `plaza`). */
interface PlazaProps {
  input: PlazaInput;
  labels: Partial<Record<PlazaLabelId, string>>;
  names: Partial<Record<PlazaSpotId, string>>;
  onSpot?: (id: PlazaSpotId) => void;
}

/**
 * The plaza for the world: the Demo Day festival, the notice board's pins
 * (null: no board) and the campfire's count. Labels over the canvas are
 * aria-hidden; each spot's accessible name carries the same words. Without
 * `onSpot` there is nothing to tap, so no names either.
 */
function plazaProps(
  festival: Festival | null,
  pins: NoticePin[] | null,
  campfire: CampfireSummary | null,
  onSpot?: (id: PlazaSpotId) => void,
): PlazaProps {
  const count = campfire ? Math.max(0, Math.trunc(campfire.count) || 0) : 0;
  const date = festival ? thaiShortDate(festival.demoDay) : "";
  const labels: PlazaProps["labels"] = {};
  if (festival) labels.sign = FESTIVAL.sign(date, festival.daysToDemo);
  if (count > 0) labels.campfireCount = CAMPFIRE.count(count);
  if (count > MAX_SEATS) labels.campfireMore = CAMPFIRE.more(count - MAX_SEATS);
  const names: PlazaProps["names"] = {};
  if (onSpot) {
    if (pins) names.notice = pins.length > 0 ? NOTICE.pinned(pins.map((pin) => pin.title)) : NOTICE.board;
    if (festival) names.stage = FESTIVAL.stage(`${date} · ${SEASON.daysLeft(festival.daysToDemo)}`);
    if (campfire) names.campfire = CAMPFIRE.spot(count);
    names.prizes = PRIZES_UI.spot;
  }
  return {
    // The Demo Day prize board always stands in the plaza.
    input: { festival, pins: pins ? pins.map((pin) => pin.kind) : null, campfire: campfire ? { count } : null, prizes: true },
    labels,
    names,
    onSpot,
  };
}

/**
 * A consent step waits: consent is not on file, or it is but the AI news line
 * is not (the consent sheet asks a parent for it, or the student confirms
 * their own age). Not while consent is off and nothing is on file.
 */
function consentStep(page: IslandPageData): boolean {
  const consent = page.consent;
  if (!consent) return false;
  if (!consent.ok) return true;
  return consent.state === "granted" && !consent.ai && consent.basis !== "adult";
}

/** The menu's rows for the player round: news while the digest is on, the prizes always, consent while a step waits. */
function menuRows(page: IslandPageData, onPanel: (panel: Panel) => void) {
  return {
    onNews: page.news?.enabled ? () => onPanel("news") : undefined,
    onPrizes: () => onPanel("prizes"),
    onConsent: consentStep(page) ? () => onPanel("consent") : undefined,
    consentAiOnly: page.consent?.ok === true,
  };
}

/** The menu button, with a lamp dot while consent itself (not only the AI line) still waits. */
function MenuRound({ page, onOpen }: { page: IslandPageData; onOpen: () => void }) {
  const pending = page.consent != null && !page.consent.ok;
  return <HudRound icon="menu" label={pending ? HUD.menuConsent : HUD.menu} dot={pending} onClick={onOpen} />;
}

/** The coin pill under the chip, when coins are live or the wallet has any. */
function coinPill(page: IslandPageData, onOpen: () => void) {
  return showCoinPill(page.character) ? <CoinPill balance={page.character.coins.balance} onOpen={onOpen} /> : null;
}

/**
 * The sheets both islands share: the wallet and shop, the Demo Day prizes,
 * the island news (only with news on the page) and consent (only when the
 * page knows the viewer's consent).
 */
function PlayerSheets({ page, panel, onPanel }: { page: IslandPageData; panel: Panel; onPanel: (panel: Panel) => void }) {
  const close = () => onPanel(null);
  const openConsent = page.consent ? () => onPanel("consent") : undefined;
  return (
    <>
      <WalletSheet open={panel === "wallet"} onClose={close} consent={page.consent} onOpenConsent={() => onPanel("consent")} />
      <PrizeSheet
        open={panel === "prizes"}
        onClose={close}
        consent={page.consent}
        onOpenConsent={openConsent}
        coinsLive={page.character ? page.character.coins.live : undefined}
      />
      {page.news ? <NewsSheet open={panel === "news"} onClose={close} news={page.news} staff={page.me.staff} /> : null}
      {page.consent ? <ConsentSheet open={panel === "consent"} onClose={close} consent={page.consent} /> : null}
    </>
  );
}

/**
 * The island for a student who has started, as a full-screen game: the
 * living island edge to edge, a minimal HUD over it, and every other screen
 * (board, quest, stuck, propose, canvas link, claim) as a sheet over the
 * island, which stays in view, dimmed and still, behind it.
 */
export function IslandApp({ page, picture, initialPhase, discordUrl, initialPanel }: IslandAppProps) {
  const project = page.island.project;
  const demoDay = page.island.season?.demo_day ?? null;
  if (!project) {
    return <Unclaimed page={page} picture={picture} initialPhase={initialPhase} demoDay={demoDay} />;
  }
  if (!page.board) {
    return <GateCard heading={GATE.unavailable.heading} body={GATE.unavailable.body} />;
  }
  return (
    <IslandHome
      page={page}
      board={page.board}
      project={project}
      picture={picture}
      initialPhase={initialPhase}
      discordUrl={discordUrl}
      initialPanel={initialPanel}
    />
  );
}

/** No project yet: the island to look at, and one action, claiming a plot (or answering an invite). */
function Unclaimed({ page, picture, initialPhase, demoDay }: IslandAppProps & { demoDay: string | null }) {
  const [storyOpen, setStoryOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [panel, setPanel] = useState<UnclaimedPanel>(null);
  const [whole, setWhole] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const invitesHeading = useRef<HTMLHeadingElement>(null);
  const invites = page.invites.length;
  const paused = storyOpen || claiming || panel != null;
  const onPanel = (next: Panel) => setPanel(next as UnclaimedPanel);
  // The plaza to look at: the festival and the campfire, no notice board and nothing to tap.
  const today = useBangkokDay();
  const festival = useMemo(
    () => festivalOf(page.island.season, page.map.goal, page.map.plots, today),
    [page.island.season, page.map.goal, page.map.plots, today],
  );
  const campfire = useCampfire(page.campfire ?? null, !paused);
  const plaza = useMemo(() => plazaProps(festival, null, campfire.summary), [festival, campfire.summary]);

  return (
    <>
      {/* The HUD first: keyboards and screen readers reach its controls before the island. */}
      <Hud
        chip={<HudLabel me={page.me} text={HUD.noPlot} />}
        pill={coinPill(page, () => setPanel("wallet"))}
        buttons={
          <>
            <StoryLauncher
              demoDay={demoDay}
              cta="claim"
              onCta={() => setClaiming(true)}
              onOpenChange={setStoryOpen}
              className={hudRoundClass}
            />
            <MenuRound page={page} onOpen={() => setPanel("menu")} />
          </>
        }
        bottom={
          <button type="button" className={`ei-button-dawn ${styles.primary} ${world.claim}`} onClick={() => setClaiming(true)} aria-haspopup="dialog">
            <span>{invites > 0 ? HUD.invites(invites) : NO_PROJECT.action}</span>
          </button>
        }
      />
      <IslandViewport
        picture={picture}
        interactive={false}
        paused={paused}
        whole={whole}
        initialPhase={initialPhase}
        plaza={plaza}
      />
      <IslandSheet
        open={claiming}
        onOpenChange={setClaiming}
        title={NO_PROJECT.heading}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          // With invites waiting, the student came to answer one: focus their heading, no keyboard pops up.
          if (invites > 0) invitesHeading.current?.focus({ preventScroll: true });
          // Otherwise straight to the name field: the story's "จับจองที่ดิน" and the button both mean "start typing".
          else nameInput.current?.focus({ preventScroll: true });
        }}
      >
        <NoProject invites={page.invites} nameInput={nameInput} invitesHeading={invitesHeading} />
      </IslandSheet>
      <MenuSheet
        open={panel === "menu"}
        onClose={() => setPanel(null)}
        me={page.me}
        project={null}
        whole={whole}
        onToggleWhole={() => {
          setWhole((current) => !current);
          setPanel(null);
        }}
        suggestUrl={page.suggestUrl ?? null}
        {...menuRows(page, onPanel)}
      />
      <PlayerSheets page={page} panel={panel} onPanel={onPanel} />
    </>
  );
}

function IslandHome({
  page,
  board,
  project,
  picture,
  initialPhase,
  discordUrl,
  initialPanel,
}: IslandAppProps & {
  board: NonNullable<IslandPageData["board"]>;
  project: NonNullable<IslandPageData["island"]["project"]>;
}) {
  const keynote = useMemo(() => keynoteQuest(board), [board]);
  const hasAction = useMemo(() => (keynote ?? starterQuest(board)) != null, [keynote, board]);
  const [panel, setPanel] = useState<Panel>(initialPanel ?? null);
  const [detail, setDetail] = useState<BoardRef | null>(null);
  // A quest opened from the board goes back to the board when it closes.
  const [detailFromBoard, setDetailFromBoard] = useState(false);
  const [stuck, setStuck] = useState<{ open: boolean; target: StuckTarget }>({
    open: false,
    target: { instanceId: null, title: null },
  });
  const [proposing, setProposing] = useState(false);
  const [plot, setPlot] = useState<IslandHotspot | null>(null);
  // The plot sheet keeps its last plot while it slides closed; its team card stays with it.
  const [lastPlot, setLastPlot] = useState<IslandHotspot | null>(null);
  if (plot && plot !== lastPlot) setLastPlot(plot);
  const shownPlot = plot ?? lastPlot;
  const [puffKey, setPuffKey] = useState(0);
  const puffTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(puffTimer.current), []);
  // The canvas picker, opened from a quest; the quest reopens once a canvas is linked.
  const [linking, setLinking] = useState(false);
  const [relinkRef, setRelinkRef] = useState<BoardRef | null>(null);
  const [storyOpen, setStoryOpen] = useState(false);
  const [whole, setWhole] = useState(false);
  const season = page.island.season;
  const todayOpen = page.island.taps_today === 0 && !page.island.resting;
  const goal = season?.goal ?? page.map.goal ?? null;
  // Any sheet or the story over the island stops its animation: nobody is looking at it.
  const paused = panel != null || detail != null || stuck.open || proposing || plot != null || linking || storyOpen;
  // The notice board is on screen in the living island, big enough to tap: it takes the board button's place.
  const [noticeSeen, setNoticeSeen] = useState(false);

  // The plaza: the next quests on the notice board, Demo Day, and who is at the campfire.
  const pins = useMemo(() => noticePins(board), [board]);
  // The countdown and the stage roll over at Bangkok midnight on a page left open.
  const today = useBangkokDay();
  const festival = useMemo(
    () => festivalOf(season, page.map.goal, page.map.plots, today),
    [season, page.map.goal, page.map.plots, today],
  );
  const campfire = useCampfire(page.campfire ?? null, !paused);
  const { loadNames } = campfire;
  const openSpot = useCallback(
    (id: PlazaSpotId) => {
      if (id === "notice") setPanel("board");
      else if (id === "stage") setPanel("festival");
      else if (id === "prizes") setPanel("prizes");
      else {
        setPanel("campfire");
        loadNames();
      }
    },
    [loadNames],
  );
  const plaza = useMemo(() => plazaProps(festival, pins, campfire.summary, openSpot), [festival, pins, campfire.summary, openSpot]);

  /**
   * The check-in is saved: the character sheet steps aside, then the dust
   * puff plays at the tree once the island is in view again.
   */
  function checkedIn() {
    setPanel((current) => (current === "character" || current === "project" ? null : current));
    window.clearTimeout(puffTimer.current);
    puffTimer.current = window.setTimeout(() => setPuffKey((key) => key + 1), SHEET_CLOSE_MS);
  }

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

  /** From the HUD's note button with no canvas linked yet: the picker, and back to the world after. */
  function openCanvasLink() {
    setPanel(null);
    setRelinkRef(null);
    setLinking(true);
  }

  /** Picker done (linked or dismissed): back to the quest it was opened from, or the world. */
  function closeLinking() {
    setLinking(false);
    if (relinkRef) setDetail(relinkRef);
    setRelinkRef(null);
  }

  return (
    <>
      {/* The HUD first: keyboards and screen readers reach its controls before the plots. Both are fixed layers. */}
      <Hud
        chip={<HudChip me={page.me} name={project.name} stage={project.stage} todayOpen={todayOpen} onOpen={() => setPanel("character")} />}
        pill={coinPill(page, () => setPanel("wallet"))}
        buttons={
          <>
            <StoryLauncher demoDay={season?.demo_day ?? null} cta="island" onOpenChange={setStoryOpen} className={hudRoundClass} />
            {/* The team's canvas: the redirect route finds it on the server (no board id on this page). */}
            {page.canvasLink.linked ? (
              <HudLinkRound icon="note" label={CANVAS.open} href={CANVAS_ROUTE} />
            ) : (
              <HudRound icon="note" label={CANVAS.link} onClick={openCanvasLink} />
            )}
            {page.unread > 0 ? (
              <HudRound icon="mail" label={HUD.inbox(page.unread)} badge={page.unread} onClick={() => setPanel("inbox")} />
            ) : null}
            <MenuRound page={page} onOpen={() => setPanel("menu")} />
          </>
        }
        bottom={
          <>
            {/* The keynote: the one gold element and the one main call to action. */}
            <KeynoteCard board={board} keynote={keynote} onOpen={(ref) => openQuest(ref, false)} />
            {/* Out of sight while the notice board is on screen (close view) next to a keynote; keyboards and screen readers keep it. */}
            <BoardButton wide={!hasAction} concealed={noticeSeen && hasAction && !whole} onClick={() => setPanel("board")} />
          </>
        }
      />
      <IslandViewport
        picture={picture}
        puffKey={puffKey}
        onPlot={setPlot}
        paused={paused}
        whole={whole}
        initialPhase={initialPhase}
        plaza={plaza}
        onNoticeVisible={setNoticeSeen}
        me={page.me}
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
      {/* From the chip: who you are, your stats and coins, then the project sheet as before (tree, today, season). */}
      <CharacterSheet
        open={panel === "character" || panel === "project"}
        onClose={() => setPanel(null)}
        me={page.me}
        stats={page.character ?? null}
        project={project}
        season={season}
        consent={page.consent}
        onOpenWallet={() => setPanel("wallet")}
        onOpenConsent={() => setPanel("consent")}
        today={
          <TodayCard
            tapsToday={page.island.taps_today}
            resting={page.island.resting}
            onSaved={checkedIn}
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
        suggestUrl={page.suggestUrl ?? null}
        {...menuRows(page, setPanel)}
      />
      <PlayerSheets page={page} panel={panel} onPanel={setPanel} />
      <InboxSheet open={panel === "inbox"} onClose={() => setPanel(null)} unread={page.unread} discordUrl={discordUrl} />
      {season && festival ? (
        <FestivalSheet
          open={panel === "festival"}
          onClose={() => setPanel(null)}
          season={season}
          festival={festival}
          goal={goal}
          onOpenProject={() => setPanel("character")}
        />
      ) : null}
      {campfire.summary ? (
        <CampfireSheet
          open={panel === "campfire"}
          onClose={() => setPanel(null)}
          summary={campfire.summary}
          names={campfire.names}
        />
      ) : null}

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
      <PlotSheet
        hotspot={plot}
        onClose={() => setPlot(null)}
        onBoard={showBoard}
        // The team's AI news card, only for a team on the news (opted in, consent on file, not hidden).
        team={shownPlot ? (page.news?.teams.find((team) => team.slot === shownPlot.slot) ?? null) : null}
        staff={page.me.staff}
      />
      <CanvasLinkSheet open={linking} link={page.canvasLink} onClose={closeLinking} onLinked={closeLinking} />
    </>
  );
}
