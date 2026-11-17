"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { checkIn, setResting } from "@/app/shift/island/actions";

import { festivalOf } from "@/lib/shift-island/festival";
import { ARRIVE_MS } from "@/lib/shift-island/live/crowd";
import { teamShirt } from "@/lib/shift-island/live/crowdSprites";
import type { PlazaSpotId } from "@/lib/shift-island/live/plaza";
import { noticePins } from "@/lib/shift-island/notice";
import type { IslandHotspot, IslandPicture } from "@/lib/shift-island/picture";
import { keynoteQuest, type BoardRef } from "@/lib/supabase/shift-quests/board";
import type { LightPhase } from "@/lib/shift-island/live/types";
import { visitorsNow } from "@/lib/shift-island/visitors";
import type { IslandPageData } from "@/lib/supabase/shift-quests/types";

import { IslandAutoRefresh } from "./IslandRefresh";
import { AdminOverview } from "./AdminOverview";
import { useCampfireSound, type CampfireSoundState } from "./CampfireSound";
import { CampfireSheet } from "./CampfireSheet";
import { CanvasLinkSheet } from "./canvas";
import { ConsentSheet } from "./consent/ConsentSheet";
import { CAMPFIRE, COMMON, GATE, HUD, MENU, NEXT_STEP, NO_PROJECT, RESULTS, TODAY } from "./copy";
import { FestivalSheet } from "./FestivalSheet";
import { BoardSheet, MenuFoot, MenuSheet, type MenuItem } from "./HudSheets";
import { NewsSheet } from "./news/NewsSheet";
import { CharacterSheet } from "./player/CharacterSheet";
import { showCoinPill } from "./player/CoinPill";
import { WalletSheet } from "./player/WalletSheet";
import { NEWS } from "./news/copy";
import { PRIZES_UI } from "./prizes/copy";
import { PrizeSheet } from "./prizes/PrizeSheet";
import { GateCard } from "./IslandGate";
import { BoardButton, BoardLink, Hud, HudChip, HudLabel } from "./IslandHud";
import styles from "./island.module.css";
import { IslandSheet } from "./IslandSheet";
import { IslandViewport } from "./IslandViewport";
import { plazaProps } from "./plazaProps";
import { NextStepCard } from "./NextStepCard";
import { nextStep, type NextStep } from "./nextStep";
import { NoProject } from "./NoProject";
import { PlotSheet } from "./PlotSheet";
import { ProposeSheet } from "./ProposeSheet";
import { QuestBoard } from "./QuestBoard";
import { QuestDetailSheet } from "./QuestDetailSheet";
import { StoryLauncher } from "./story/StoryLauncher";
import { StuckSheet, type StuckTarget } from "./StuckSheet";
import { todayQuest } from "./model";
import { questResults } from "./results";
import { ResultsList } from "./ResultsList";
import { RootsLine } from "./RootsLine";
import { treeWaiting } from "./tree/TreePill";
import { TreeSheet } from "./tree/TreeSheet";
import { PeerSheet } from "./peer/PeerSheet";
import { useBangkokDay } from "./useBangkokDay";
import { useCampfire } from "./useCampfire";
import { useDayIntention } from "./useDayIntention";
import { PLAYER_MENU } from "./player/copy";
import { markResultsSeen, readResultsSeen, useFreshApproval, useFreshResults } from "./useResultsSeen";
import { useStartQuest } from "./useStartQuest";
import { IslandVoyage, useVoyage, VoyageCover, type Voyage } from "./voyage";
import world from "./world.module.css";

interface IslandAppProps {
  /** Shaped by getIslandPage: never the Discord id or the session. */
  page: IslandPageData;
  picture: IslandPicture | null;
  /** Bangkok's light when the server rendered the page: the island is in it from the first paint. */
  initialPhase?: LightPhase;
  /** The SHIFT Discord server's URL (from the server's env), for the inbox's "open Discord". */
  discordUrl?: string | null;
  /** A sheet to open on arrival: the quest board or the canvas picker for a stale link. Only with a plot. */
  initialPanel?: "board" | "canvas";
  /** `?at=voyage` from the ticket: sail across even on a browser that has crossed before. */
  voyage?: boolean;
}

/** About as long as a sheet takes to slide away (vaul's drawer is the slower one). */
const SHEET_CLOSE_MS = 450;

/**
 * The sheets opened from the HUD itself, the chip's sheet or the plaza; at
 * most one at a time. With a plot the chip opens "character", which holds the
 * mentors' results and the menu's lines; before one, the chip opens "menu".
 */
type Panel =
  | "admin"
  | "board"
  | "menu"
  | "festival"
  | "campfire"
  | "character"
  | "wallet"
  | "prizes"
  | "news"
  | "consent"
  | "tree"
  | null;

/** The sheets a student without a plot can open: the menu and what it leads to, and the wallet. */
type UnclaimedPanel = Extract<Panel, "admin" | "menu" | "wallet" | "prizes" | "news" | "consent"> | null;

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

/** The menu's consent row while a step waits (consent itself, or only the AI news line). */
function consentRow(page: IslandPageData, onPanel: (panel: Panel) => void) {
  return {
    onConsent: consentStep(page) ? () => onPanel("consent") : undefined,
    consentAiOnly: page.consent?.ok === true,
  };
}

/** Consent itself (not only the AI news line) still waits: the chip carries a lamp dot. */
function consentPending(page: IslandPageData): boolean {
  return page.consent != null && !page.consent.ok;
}

/**
 * The menu's lines both islands share, for what has no place on the island:
 * the admin overview (admins), then the guide, the story again, the island
 * news (while the digest is on) and the campfire's sound.
 */
function sharedItems(page: IslandPageData, onPanel: (panel: Panel) => void, story: () => void, sound: CampfireSoundState): {
  admin: MenuItem[];
  places: MenuItem[];
  settings: MenuItem[];
} {
  const admin: MenuItem[] = page.me.admin ? [{ id: "admin", icon: "eye", label: MENU.admin, onClick: () => onPanel("admin") }] : [];
  const places: MenuItem[] = [
    { id: "guide", icon: "signpost", label: MENU.guide, href: "/shift/island/guide" },
    { id: "story", icon: "book", label: MENU.story, onClick: story },
  ];
  if (page.news?.enabled) places.push({ id: "news", icon: "news", label: NEWS.menu, onClick: () => onPanel("news") });
  // Folded under ตั้งค่า (MenuFoot): nobody needs it every day.
  const settings: MenuItem[] = [{
    id: "sound",
    icon: "megaphone",
    label: sound.failed ? CAMPFIRE.soundError : MENU.sound,
    state: sound.failed ? undefined : sound.playing ? MENU.on : MENU.off,
    pressed: sound.playing,
    disabled: sound.pending,
    onClick: sound.toggle,
  }];
  return { admin, places, settings };
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
      {page.me.admin ? <AdminOverview open={panel === "admin"} onClose={close} data={page.adminOverview ?? null} /> : null}
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
export function IslandApp({ page, picture, initialPhase, discordUrl, initialPanel, voyage }: IslandAppProps) {
  const project = page.island.project;
  const demoDay = page.island.season?.demo_day ?? null;
  if (!project) {
    return <Unclaimed page={page} picture={picture} initialPhase={initialPhase} demoDay={demoDay} voyage={voyage} />;
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
      voyage={voyage}
    />
  );
}

/**
 * The crossing from the invite's beach, over the island on a first arrival
 * (or when the ticket sent the student here). The story waits for it, and the
 * island holds still underneath until the closing circle shows it.
 */
function Crossing({ page, voyage }: { page: IslandPageData; voyage: Voyage }) {
  return (
    <>
      {voyage.holding ? <VoyageCover /> : null}
      <IslandVoyage open={voyage.open} name={page.me.name} onReveal={voyage.reveal} onDone={voyage.close} />
    </>
  );
}

/** No project yet: the island to look at, and one action, claiming a plot (or answering an invite). */
function Unclaimed({ page, picture, initialPhase, demoDay, voyage: forcedVoyage = false }: IslandAppProps & { demoDay: string | null }) {
  const voyage = useVoyage(forcedVoyage);
  const [storyOpen, setStoryOpen] = useState(false);
  // The menu's เรื่องเล่า line plays the story again.
  const [storyKey, setStoryKey] = useState(0);
  const sound = useCampfireSound();
  const [claiming, setClaiming] = useState(false);
  const [panel, setPanel] = useState<UnclaimedPanel>(null);
  const [whole, setWhole] = useState(page.me.admin === true);
  const nameInput = useRef<HTMLInputElement>(null);
  const invitesHeading = useRef<HTMLHeadingElement>(null);
  const invites = page.invites.length;
  const paused = storyOpen || claiming || panel != null || voyage.holding;
  const onPanel = (next: Panel) => setPanel(next as UnclaimedPanel);
  const pending = consentPending(page);
  // The plaza to look at: the festival and the campfire, no notice board and nothing to tap.
  const today = useBangkokDay();
  const festival = useMemo(
    () => festivalOf(page.island.season, page.map.goal, page.map.plots, today),
    [page.island.season, page.map.goal, page.map.plots, today],
  );
  const campfire = useCampfire(page.campfire ?? null, !paused);
  // Today's visitors, anonymous: without a plot the viewer has no check-in and no team of their own.
  const visitors = useMemo(() => visitorsNow(page.visitors, { me: false, counted: false }), [page.visitors]);
  const plaza = useMemo(() => plazaProps(festival, null, campfire.summary, undefined, visitors), [festival, campfire.summary, visitors]);
  const shared = sharedItems(page, onPanel, () => {
    setPanel(null);
    setStoryKey((key) => key + 1);
  }, sound);
  // Nothing on this island is tapped yet (no plot, no plaza spots), so the coins and the prizes are lines here.
  const unclaimedItems: MenuItem[] = [
    ...shared.admin,
    ...(showCoinPill(page.character) ? [{ id: "coins", icon: "coin", label: MENU.coins, onClick: () => onPanel("wallet") } satisfies MenuItem] : []),
    { id: "prizes", icon: "trophy", label: PRIZES_UI.menu, onClick: () => onPanel("prizes") },
    ...shared.places,
  ];

  return (
    <>
      {/* The HUD first: keyboards and screen readers reach its controls before the island. */}
      <Hud
        chip={
          <HudLabel
            me={page.me}
            text={HUD.noPlot}
            label={pending ? HUD.menuConsent : HUD.menu}
            dot={pending}
            onOpen={() => setPanel("menu")}
          />
        }
        buttons={
          <>
            <StoryLauncher
              demoDay={demoDay}
              cta="claim"
              onCta={() => setClaiming(true)}
              onOpenChange={setStoryOpen}
              autoOpen={!voyage.open}
              button={false}
              openKey={storyKey}
            />
            <IslandAutoRefresh />
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
        claimed={false}
        whole={whole}
        onToggleWhole={() => {
          setWhole((current) => !current);
          setPanel(null);
        }}
        suggestUrl={page.suggestUrl ?? null}
        items={unclaimedItems}
        settings={shared.settings}
        {...consentRow(page, onPanel)}
      />
      <PlayerSheets page={page} panel={panel} onPanel={onPanel} />
      <Crossing page={page} voyage={voyage} />
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
  voyage: forcedVoyage = false,
}: IslandAppProps & {
  board: NonNullable<IslandPageData["board"]>;
  project: NonNullable<IslandPageData["island"]["project"]>;
}) {
  const voyage = useVoyage(forcedVoyage);
  const keynote = useMemo(() => keynoteQuest(board), [board]);
  // The quest the day's line (the roots) is filed under: the keynote, or with nothing open none.
  const dayQuest = useMemo(() => todayQuest(board, keynote), [board, keynote]);
  // Set once the day's check-in is in, so the card stops asking before the refreshed page arrives.
  const [tappedHere, setTappedHere] = useState(false);
  const tapsToday = page.island.taps_today > 0 || tappedHere ? Math.max(page.island.taps_today, 1) : 0;
  const memberId = page.memberId ?? null;
  // Mentors' results on the student's own work, read from the board: in the chip's sheet, and a fresh approval on the card.
  const results = useMemo(() => questResults(board), [board]);
  const fresh = useFreshResults(results, memberId);
  const approved = useFreshApproval(results, memberId);
  const step = useMemo(
    () => nextStep(board, { tapsToday, resting: page.island.resting, approved: approved?.ref ?? null }),
    [board, tapsToday, page.island.resting, approved],
  );
  // The quest page's ไปเควสต์ถัดไป: the student's work, never a result to look at or work waiting on a mentor.
  const nextWork = useMemo(() => {
    const work = nextStep(board, { tapsToday, resting: page.island.resting });
    return work && (work.action === "start" || work.action === "open") ? work.ref : null;
  }, [board, tapsToday, page.island.resting]);
  const intended = useDayIntention(memberId);
  const [resting, startRest] = useTransition();
  const quest = useStartQuest();
  const [resultsSeen, setResultsSeen] = useState<{ since: number | null; at: number }>({ since: null, at: 0 });
  // The menu's เรื่องเล่า line plays the story again.
  const [storyKey, setStoryKey] = useState(0);
  const sound = useCampfireSound();
  const [panel, setPanel] = useState<Panel>(initialPanel === "board" ? "board" : null);
  // ช่วยเพื่อนเช็ก (schema 15) opens over the board, so the board stays where it was.
  const [peerOpen, setPeerOpen] = useState(false);
  const [detail, setDetail] = useState<BoardRef | null>(null);
  // A quest opened from the board goes back to the board when it closes.
  const [detailFromBoard, setDetailFromBoard] = useState(false);
  const [stuck, setStuck] = useState<{ open: boolean; target: StuckTarget }>({
    open: false,
    target: { instanceId: null, title: null },
  });
  const [proposing, setProposing] = useState(false);
  const [plot, setPlot] = useState<IslandHotspot | null>(null);
  // The team's tree (schema 13); null below it, and then the own plot opens the plot sheet as before.
  const tree = page.tree ?? null;
  // The plot sheet keeps its last plot while it slides closed; its team card stays with it.
  const [lastPlot, setLastPlot] = useState<IslandHotspot | null>(null);
  if (plot && plot !== lastPlot) setLastPlot(plot);
  const shownPlot = plot ?? lastPlot;
  const [puffKey, setPuffKey] = useState(0);
  const puffTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(puffTimer.current), []);
  // A saved check-in waits for the island to be in view again before the dust puff plays.
  const puffQueued = useRef(false);
  // The viewer's own figure in the plaza: it walks in with the dust puff of a check-in made on this
  // page ("walking"), then stays ("here"). A check-in made before the page loaded is already there.
  const [arrival, setArrival] = useState<"none" | "walking" | "here">("none");
  const arriveTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(arriveTimer.current), []);
  // The canvas picker, opened from a quest; the quest reopens once a canvas is linked.
  const [linking, setLinking] = useState(initialPanel === "canvas");
  const [relinkRef, setRelinkRef] = useState<BoardRef | null>(null);
  const [storyOpen, setStoryOpen] = useState(false);
  const [whole, setWhole] = useState(page.me.admin === true);
  const season = page.island.season;
  const goal = season?.goal ?? page.map.goal ?? null;
  // Any sheet or the story over the island stops its animation: nobody is looking at it.
  const paused =
    panel != null ||
    detail != null ||
    stuck.open ||
    proposing ||
    plot != null ||
    linking ||
    storyOpen ||
    voyage.holding;
  useEffect(() => {
    if (paused || !puffQueued.current) return;
    puffQueued.current = false;
    window.clearTimeout(puffTimer.current);
    puffTimer.current = window.setTimeout(() => {
      setPuffKey((key) => key + 1);
      setArrival("walking");
      window.clearTimeout(arriveTimer.current);
      arriveTimer.current = window.setTimeout(() => setArrival("here"), ARRIVE_MS);
    }, SHEET_CLOSE_MS);
  }, [paused]);
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
  // Today's visitors: the viewer's own figure once their check-in is in, their teammates in the team's colour.
  const counted = page.island.taps_today > 0;
  const meHere = arrival !== "none" || (counted && !tappedHere);
  const shirt = teamShirt(tree?.equipped.leaf);
  const visitors = useMemo(() => {
    const now = visitorsNow(page.visitors, { me: meHere, counted });
    return now ? { ...now, arriving: arrival === "walking", shirt } : null;
  }, [page.visitors, meHere, counted, arrival, shirt]);
  const plaza = useMemo(
    () => plazaProps(festival, pins, campfire.summary, openSpot, visitors),
    [festival, pins, campfire.summary, openSpot, visitors],
  );

  /** The team's tree up close. */
  function openTree() {
    setPanel("tree");
  }

  /**
   * The day's first tap that leads to work is the day's check-in: saved
   * quietly, never a screen between the student and the work. If it fails
   * the work still opens; the next tap tries again.
   */
  function checkInQuietly(next: NextStep) {
    if (!next.checksIn) return;
    setTappedHere(true);
    void checkIn({ instanceId: next.instanceId }).then((result) => {
      // The dust puff only for a check-in that is in; a failed one leaves the next tap to try again.
      if (result.ok) puffQueued.current = true;
      else setTappedHere(false);
    });
  }

  /**
   * The card's one button (step.action): wake up; start an untouched quest and
   * open it; or open the quest (a fresh result is marked seen first, so the
   * card moves on).
   */
  async function tapNext(next: NextStep) {
    if (next.action === "wake") return rest(false);
    if (!next.ref) return;
    // Seen up to this approval only: anything newer stays new in the chip's sheet.
    if (next.kind === "reviewed" && approved) markResultsSeen(memberId, Date.parse(approved.at));
    if (next.action === "start" && !(await quest.start(next.ref))) return;
    openQuest(next.ref, false);
    checkInQuietly(next);
  }

  /** ขอพัก from the chip's sheet, กลับมาทำต่อ from the card. Nothing wilts and nothing is lost either way. */
  function rest(on: boolean) {
    setPanel(null);
    startRest(async () => {
      const result = await setResting({ on });
      if (!result.ok) toast.error(result.error || COMMON.failed);
      else if (!on) toast.success(TODAY.woke);
      else if (result.data.paused > 0) toast.success(TODAY.rested(result.data.paused));
      else toast.info(TODAY.nothingToPause);
    });
  }

  /** The chip's sheet: mentors' results new since the last look stay marked ใหม่ while it is open, and the dot clears. */
  function openCharacter() {
    setResultsSeen({ since: readResultsSeen(memberId), at: Date.now() });
    markResultsSeen(memberId);
    setPanel("character");
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

  /** From the sent screen: back to the world, wherever the quest was opened from. */
  function leaveQuest() {
    setDetail(null);
    setDetailFromBoard(false);
  }

  /** From the sent screen: the team's tree up close (schema 13), where a gift kept for later waits. */
  function openTreeFromQuest() {
    leaveQuest();
    openTree();
  }

  /** From the student's own plot: the plot sheet gives way to the quest board. */
  function showBoard() {
    setPlot(null);
    setPanel("board");
  }

  /** A tapped plot: the team's own opens its tree up close (schema 13), any other the plot sheet. */
  function openPlot(hotspot: IslandHotspot) {
    if (hotspot.mine && tree) openTree();
    else setPlot(hotspot);
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

  /** Picker done (linked or dismissed): back to the quest it was opened from, or the world. */
  function closeLinking() {
    setLinking(false);
    if (relinkRef) setDetail(relinkRef);
    setRelinkRef(null);
  }

  // The menu's lines, at the foot of the chip's sheet: only what has no place on the island. The tree is
  // the team's plot (and a line in the same sheet), the prizes, the campfire and Demo Day stand in the
  // plaza, and the canvas opens from a quest.
  const shared = sharedItems(page, setPanel, () => {
    setPanel(null);
    setStoryKey((key) => key + 1);
  }, sound);
  // Consent itself has its banner at the top of the sheet; only the AI news line needs a line here.
  const consent = consentRow(page, setPanel);
  const aiConsent: MenuItem[] =
    consent.onConsent && consent.consentAiOnly ? [{ id: "consent", icon: "letter", label: PLAYER_MENU.aiNews, onClick: consent.onConsent }] : [];
  // The admin's overview and ขอพัก sit at the top of the sheet (CharacterSheet), not in this list.
  const homeItems: MenuItem[] = [...aiConsent, ...shared.places];
  // The chip's lamp dot: consent waits, a mentor's result is new, something waits at the tree, or the bot left notices.
  const chipWaiting =
    (consentPending(page) ? HUD.menuConsent : null) ??
    (fresh > 0 ? RESULTS.hud(fresh) : null) ??
    (tree ? treeWaiting(tree) : null) ??
    (page.unread > 0 ? RESULTS.discord(page.unread) : null);

  return (
    <>
      {/* The HUD first: keyboards and screen readers reach its controls before the plots. Both are fixed layers. */}
      <Hud
        chip={
          <HudChip
            me={page.me}
            name={project.name}
            stage={project.stage}
            waiting={chipWaiting}
            onOpen={openCharacter}
          />
        }
        buttons={
          <>
            {/* No button of its own: the story still opens on a first visit, and the chip sheet's line plays it again. */}
            <StoryLauncher
              demoDay={season?.demo_day ?? null}
              cta="island"
              onOpenChange={setStoryOpen}
              autoOpen={!voyage.open}
              button={false}
              openKey={storyKey}
            />
            <IslandAutoRefresh />
          </>
        }
        bottom={
          step ? (
            <div className={world.nextStack}>
              {/* The one gold element and the one main action: the next step. */}
              <NextStepCard
                board={board}
                step={step}
                intended={intended}
                pending={quest.pending || resting}
                onTap={(next) => void tapNext(next)}
              />
              <BoardLink label={NEXT_STEP.board} onClick={() => setPanel("board")} />
            </div>
          ) : (
            // Nothing left to do next (all seven passed): the board is the bottom action.
            <BoardButton wide onClick={() => setPanel("board")} />
          )
        }
      />
      <IslandViewport
        picture={picture}
        puffKey={puffKey}
        onPlot={openPlot}
        paused={paused}
        whole={whole}
        initialPhase={initialPhase}
        plaza={plaza}
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
          tree={tree}
          onSeed={openTree}
          // Schema 15: ช่วยเพื่อนเช็ก opens the peer check over the board.
          onPeerCheck={page.peer === true ? () => setPeerOpen(true) : undefined}
        />
      </BoardSheet>
      {page.peer === true ? <PeerSheet open={peerOpen} onClose={() => setPeerOpen(false)} /> : null}
      {tree ? (
        <TreeSheet
          open={panel === "tree"}
          onClose={() => setPanel(null)}
          tree={tree}
          onBoard={() => setPanel("board")}
          projectId={page.photos === true ? (project?.id ?? null) : null}
          roots={<RootsLine instanceId={dayQuest?.instanceId ?? null} />}
        />
      ) : null}
      {/* From the chip: the one door to everything that is not the next step. */}
      <CharacterSheet
        open={panel === "character"}
        onClose={() => setPanel(null)}
        me={page.me}
        stats={page.character ?? null}
        projectId={project.id}
        invites={page.invites}
        project={project}
        tree={page.tree ?? null}
        consent={page.consent}
        onOpenWallet={() => setPanel("wallet")}
        onOpenConsent={() => setPanel("consent")}
        onOpenTree={tree ? openTree : undefined}
        showName={project}
        onOpenAdmin={page.me.admin ? () => setPanel("admin") : undefined}
        onRest={page.island.resting ? undefined : () => rest(true)}
        results={
          <ResultsList
            results={results}
            since={resultsSeen.since}
            openedAt={resultsSeen.at}
            onOpen={(ref) => openQuest(ref, false)}
            unread={page.unread}
            discordUrl={discordUrl}
          />
        }
        foot={
          <MenuFoot
            me={page.me}
            claimed
            whole={whole}
            onToggleWhole={() => {
              setWhole((current) => !current);
              setPanel(null);
            }}
            suggestUrl={page.suggestUrl ?? null}
            items={homeItems}
            settings={shared.settings}
          />
        }
      />
      <PlayerSheets page={page} panel={panel} onPanel={setPanel} />
      {season && festival ? (
        <FestivalSheet
          open={panel === "festival"}
          onClose={() => setPanel(null)}
          season={season}
          festival={festival}
          goal={goal}
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
        onIsland={leaveQuest}
        onTree={tree ? openTreeFromQuest : undefined}
        // The first act's quests start from the problem the team planted with its seed (schema 13).
        team={tree ? { ambition: tree.ambition ?? null, planted: tree.seed != null } : null}
        onPlant={tree ? openTreeFromQuest : undefined}
        // A ตัวช่วย side quest opens in the same sheet; closing it goes where this quest would have.
        onOpenQuest={setDetail}
        // Schema 14: photos with the work, and เปลี่ยน on the team's problem line.
        photos={page.photos === true}
        projectId={project?.id ?? null}
        peer={page.peer === true}
        // ไปเควสต์ถัดไป: the student's next work (nextWork), never a result or work waiting on a mentor.
        next={nextWork}
        viewerKey={memberId}
      />
      <StuckSheet
        open={stuck.open}
        target={stuck.target}
        onClose={() => setStuck((current) => ({ ...current, open: false }))}
      />
      <ProposeSheet open={proposing} onClose={() => setProposing(false)} />
      <PlotSheet
        adminProject={page.me.admin && shownPlot ? page.adminOverview?.projects.find((p) => p.slot === shownPlot.slot) : undefined}
        hotspot={plot}
        onClose={() => setPlot(null)}
        onBoard={showBoard}
        // The team's AI news card, only for a team on the news (opted in, consent on file, not hidden).
        team={shownPlot ? (page.news?.teams.find((team) => team.slot === shownPlot.slot) ?? null) : null}
        staff={page.me.staff}
      />
      <CanvasLinkSheet open={linking} link={page.canvasLink} onClose={closeLinking} onLinked={closeLinking} />
      <Crossing page={page} voyage={voyage} />
    </>
  );
}
