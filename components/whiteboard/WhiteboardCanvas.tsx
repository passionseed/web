"use client";

import "@excalidraw/excalidraw/index.css";
import "./whiteboard.css";

import {
  convertToExcalidrawElements,
  Excalidraw,
  loadFromBlob,
  MainMenu,
  restoreElements,
  useHandleLibrary,
  WelcomeScreen,
} from "@excalidraw/excalidraw";
import type { NonDeleted, OrderedExcalidrawElement, ExcalidrawEmbeddableElement } from "@excalidraw/excalidraw/element/types";
import type { AppState, BinaryFiles, ExcalidrawProps } from "@excalidraw/excalidraw/types";
import { ArrowLeft, Copy, FileUp, GraduationCap, LayoutTemplate, Save, Settings } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { WhiteboardDetail } from "@/lib/supabase/whiteboards";
import { canEdit, type LinkAccess } from "@/lib/whiteboard/core";
import { exportBackgroundFor } from "@/lib/whiteboard/settings";
import { CARD_KINDS, CARDS, cardLibrarySkeleton } from "@/lib/whiteboard/cards";
import { questName, type Quest } from "@/lib/whiteboard/quests";
import { templateById } from "@/lib/whiteboard/templates";
import { widgetIdOf, widgetLink } from "@/lib/whiteboard/widgets";

import { ActivityPanel } from "./ActivityPanel";
import { AuthorsLayer } from "./AuthorsLayer";
import { BoardCorner } from "./chrome/BoardCorner";
import { BottomBar } from "./chrome/BottomBar";
import { GrainDefs } from "./chrome/Grain";
import { PeopleCorner } from "./chrome/PeopleCorner";
import { CommentsLayer } from "./CommentsLayer";
import { EmoteLayer, useEmotes } from "./EmoteLayer";
import { focusElement } from "./focusElement";
import { WB_FONT_VARS } from "./fonts";
import { insertElements, insertSkeletons, insertWidget } from "./insert";
import { KitSidebar, openKit } from "./KitSidebar";
import { boardLibraryAdapter } from "./libraryAdapter";
import { BoardWidget } from "./plugins/BoardWidget";
import { PluginHost, usePluginWindows } from "./plugins/PluginHost";
import type { BoardPlugin } from "./plugins/types";
import { BoardBackdrop } from "./settings/BoardBackdrop";
import { BoardSettingsDialog } from "./settings/BoardSettingsDialog";
import { useBoardSettings } from "./settings/useBoardSettings";
import { useCanvasBackground } from "./settings/useCanvasBackground";
import { CanvasTeamLayer } from "./shift/CanvasTeamLayer";
import { CardVersionsLayer } from "./shift/CardVersionsLayer";
import { useShiftCardCaret } from "./shift/useShiftCardCaret";
import { useCanvasFit } from "./shift/useCanvasFit";
import { ZoneAddLayer } from "./shift/ZoneAddLayer";
import { openQuestPanel, QuestPane, useQuestPane } from "./quest/QuestPane";
import { useBoardPeople } from "./useBoardPeople";
import { QuestLayer } from "./quest/QuestLayer";
import { QuestMenu } from "./quest/QuestMenu";
import { useQuestSession } from "./quest/useQuestSession";
import { ShareDialog } from "./ShareDialog";
import { TimerWidget } from "./TimerWidget";
import { useComments } from "./useComments";
import { bridgeWheel } from "./wheelBridge";
import { boardApi, useWhiteboardSync } from "./useWhiteboardSync";

type Me = { id: string; name: string; avatarUrl: string | null; isAdmin?: boolean };
type Theme = "light" | "dark";

const THEME_KEY = "whiteboard-theme";
// Thai faces registered in whiteboard.css under Excalidraw's family names.
const THAI_FONTS = ["Excalifont", "Nunito", "Comic Shanns"];

/** Excalidraw options that never change; a new object each render would re-render it. */
const UI_OPTIONS: ExcalidrawProps["UIOptions"] = { canvasActions: { loadScene: false, saveToActiveFile: false } };

/** Only our own widget links may be embedded; anything else falls back to Excalidraw's rules. */
const validateEmbeddable = (link: string) => (widgetIdOf(link) ? true : undefined);

/** Loads the Thai faces up front so Thai text is measured with the right font. */
function preloadThaiFonts() {
  if (typeof document === "undefined" || !document.fonts) return;
  for (const family of THAI_FONTS) void document.fonts.load(`20px "${family}"`, "ก").catch(() => undefined);
}

/** Room cards in the Library panel, each with its name on top, so people can tell them apart and drag them onto any board. */
function cardLibrary() {
  return CARD_KINDS.map((kind) => ({
    id: `passionseed-card-${kind}`,
    status: "published" as const,
    name: CARDS[kind].title,
    created: 0,
    elements: convertToExcalidrawElements(cardLibrarySkeleton(kind)),
  }));
}

/** The Library: our cards, plus what each person adds or installs from libraries.excalidraw.com, kept in their browser. */
const LIBRARY_ADAPTER = boardLibraryAdapter(cardLibrary);

/** The live editor: Excalidraw plus sync, stickies, comments, reactions, timer, history and sharing. */
export default function WhiteboardCanvas({
  board,
  me,
  templateId,
  focusId,
}: {
  board: WhiteboardDetail;
  me: Me;
  templateId?: string | null;
  focusId?: string | null;
}) {
  const editable = canEdit(board.role);
  const isAdmin = Boolean(me.isAdmin);
  const initialElements = useMemo(
    () => restoreElements(board.elements as never, null) as readonly OrderedExcalidrawElement[],
    [board.elements],
  );
  const initialData = useMemo(() => {
    const theme = (typeof window !== "undefined" && (localStorage.getItem(THEME_KEY) as Theme | null)) || "light";
    // See-through from the first paint: the paper and the dots are our own layer (BoardBackdrop).
    return { elements: initialElements, appState: { theme, viewBackgroundColor: "transparent" }, scrollToContent: true };
  }, [initialElements]);

  // Moderators (the board's owner and site admins on it) may change any SHIFT canvas; everyone else only their own team's.
  const managerIds = board.managerIds;
  const isManager = managerIds.includes(me.id);
  const lastBlockedToast = useRef(0);
  const onCanvasBlocked = useCallback(() => {
    if (Date.now() - lastBlockedToast.current < 4000) return;
    lastBlockedToast.current = Date.now();
    toast.info("เปลี่ยนตรงนี้ไม่ได้: แคนวาสนี้แก้ได้เฉพาะทีม และลบได้เฉพาะเจ้าของ");
  }, []);
  // SHIFT canvas rows grow and shrink with this person's notes; the sync hook says when they edited.
  const localEdit = useRef<(changed: readonly OrderedExcalidrawElement[]) => void>(undefined);
  // Quest sessions: while one runs, everything this person makes is tagged with it (lib/whiteboard/quests.ts).
  const quest = useQuestSession(board.id, me.id);
  // Everyone's Discord name and picture, a moment after the board opens; profile names until then.
  const discord = useBoardPeople(board.id, () => [
    me.id,
    ...board.members.map((m) => m.userId),
    ...initialElements.flatMap((el) => {
      const data = el.customData as { createdBy?: unknown; updatedBy?: unknown; quest?: { by?: unknown } } | undefined;
      return [data?.createdBy, data?.updatedBy, data?.quest?.by].filter((v): v is string => typeof v === "string");
    }),
  ]);
  const shownAs = useCallback((userId: string) => discord[userId], [discord]);
  const shownMe = useMemo(
    () => ({ ...me, name: discord[me.id]?.name ?? me.name, avatarUrl: discord[me.id]?.avatarUrl ?? me.avatarUrl }),
    [me, discord],
  );
  const sync = useWhiteboardSync({
    boardId: board.id,
    role: board.role,
    me: shownMe,
    shownAs,
    initialElements,
    managerIds,
    onCanvasBlocked,
    onLocalEdit: (changed) => localEdit.current?.(changed),
    newElementData: editable ? quest.newElementData : undefined,
  });
  const api = sync.excalidrawAPI;
  localEdit.current = useCanvasFit(api, me.id, isManager);
  // Loads and saves the Library, and installs libraries from libraries.excalidraw.com (#addLibrary links).
  useHandleLibrary({ excalidrawAPI: api, adapter: LIBRARY_ADAPTER });
  const { send: syncSend, on: syncOn, onChange: syncOnChange, onPointerUpdate: syncOnPointer, saveNow, refreshFiles } = sync;
  const channel = useMemo(() => ({ send: syncSend, on: syncOn }), [syncSend, syncOn]);
  const comments = useComments(board.id, channel, shownAs);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const emotes = useEmotes(api, channel, pointer);
  useShiftCardCaret(api);
  const { start: startQuestSession, end: endQuestSession } = quest;
  const startQuest = useCallback(
    (q: Quest) => {
      startQuestSession(q);
      toast.success(`เริ่ม ${questName(q)}`, { description: "ทุกอย่างที่วาดหรือเขียนจากนี้นับเป็นงานของ Quest นี้ จนกว่าจะกดจบ" });
    },
    [startQuestSession],
  );
  const endQuest = useCallback(() => {
    endQuestSession();
    toast.success("จบ Quest แล้ว", { description: "คลิกขวาที่งานชิ้นไหนก็ย้าย Quest ได้" });
  }, [endQuestSession]);
  const { settings, update: updateSettings } = useBoardSettings(board.id);
  useCanvasBackground(api, exportBackgroundFor(settings));

  const [title, setTitle] = useState(board.title);
  const [shareOpen, setShareOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [linkAccess, setLinkAccess] = useState<LinkAccess>(board.linkAccess);
  const [shareToken, setShareToken] = useState(board.shareToken);
  const [members, setMembers] = useState(board.members);
  const [placingComment, setPlacingComment] = useState(false);
  const [openThread, setOpenThread] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [showAuthors, setShowAuthors] = useState(false);
  const windows = usePluginWindows(board.id);
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({});
  const importInput = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const theme = useRef<Theme>(initialData.appState.theme);
  // Excalidraw hands over its API before the initial scene loads; wait for the first change.
  const [sceneReady, setSceneReady] = useState(false);

  // Wheel and pinch over chips and canvas names move the board, not the page.
  useEffect(() => (root.current ? bridgeWheel(root.current) : undefined), []);

  // People who opened the board since this page loaded also show up in the list.
  const people = useMemo(() => {
    const known = new Set(members.map((m) => m.userId));
    // One entry per person, even with several tabs open.
    const newcomers = sync.present
      .filter((p) => !known.has(p.userId) && Boolean(known.add(p.userId)))
      .map((p) => ({ userId: p.userId, name: p.name, avatarUrl: p.avatarUrl, role: p.role }));
    return [...members, ...newcomers].map((p) =>
      discord[p.userId] ? { ...p, name: discord[p.userId].name, avatarUrl: discord[p.userId].avatarUrl ?? p.avatarUrl } : p,
    );
  }, [members, sync.present, discord]);
  const namesById = useMemo(() => new Map(people.map((p) => [p.userId, p.name])), [people]);
  const nameOf = useCallback(
    (id: string) => discord[id]?.name ?? namesById.get(id) ?? authorNames[id] ?? "Someone",
    [discord, namesById, authorNames],
  );
  const avatarOf = useCallback(
    (id: string) => discord[id]?.avatarUrl ?? people.find((p) => p.userId === id)?.avatarUrl ?? null,
    [discord, people],
  );
  const onlineIds = useMemo(() => new Set(sync.present.map((p) => p.userId)), [sync.present]);

  // What board apps get: the board, who I am, and who is online now (one entry per person).
  const boardInfo = useMemo(() => ({ id: board.id, title, role: board.role }), [board.id, title, board.role]);
  const pluginMe = useMemo(() => ({ id: me.id, name: me.name, avatarUrl: me.avatarUrl }), [me.id, me.name, me.avatarUrl]);
  const players = useMemo(() => {
    const seen = new Set<string>();
    const list: { userId: string; name: string; avatarUrl: string | null }[] = [];
    for (const p of sync.present) {
      if (seen.has(p.userId)) continue;
      seen.add(p.userId);
      list.push({ userId: p.userId, name: p.name, avatarUrl: p.avatarUrl });
    }
    // Presence can lag behind the first render; I am always playing.
    if (!seen.has(pluginMe.id)) list.unshift({ userId: pluginMe.id, name: pluginMe.name, avatarUrl: pluginMe.avatarUrl });
    return list;
  }, [sync.present, pluginMe]);

  const onChange = useCallback(
    (elements: readonly OrderedExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      if (appState.theme !== theme.current) {
        theme.current = appState.theme;
        localStorage.setItem(THEME_KEY, appState.theme);
      }
      if (!sceneReady) setSceneReady(true);
      syncOnChange(elements, appState, files);
    },
    [sceneReady, syncOnChange],
  );

  const onPointerUpdate = useCallback(
    (update: Parameters<typeof syncOnPointer>[0]) => {
      pointer.current = { x: update.pointer.x, y: update.pointer.y };
      syncOnPointer(update);
    },
    [syncOnPointer],
  );

  useEffect(preloadThaiFonts, []);

  // A board made from a template starts with it.
  useEffect(() => {
    const template = templateById(templateId);
    if (!api || !sceneReady || !editable || !template) return;
    window.history.replaceState(null, "", `/whiteboard/${board.id}`);
    if (api.getSceneElements().length > 0) return;
    const placed = insertSkeletons(api, template.build(), { x: 0, y: 0 });
    api.scrollToContent(placed, { fitToViewport: true, viewportZoomFactor: 0.85 });
  }, [api, board.id, editable, sceneReady, templateId]);

  // ?focus=<element> (the SHIFT High island's "เปิดแคนวาส" and "ดูบนแคนวาส"): bring it into view once,
  // then tidy the address. An unknown id leaves the board's usual scroll-to-content.
  const focused = useRef(false);
  useEffect(() => {
    if (!api || !sceneReady || !focusId || focused.current) return;
    focused.current = true;
    const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    focusElement(api, focusId, reduced);
    window.history.replaceState(null, "", `/whiteboard/${board.id}`);
  }, [api, board.id, focusId, sceneReady]);

  const saveAndTell = useCallback(async () => {
    if (!editable) return;
    const ok = await saveNow();
    api?.setToast({ message: ok ? "บันทึกแล้ว · Saved" : "ยังบันทึกไม่ได้ จะลองใหม่ให้", duration: 1500 });
  }, [api, editable, saveNow]);

  // Ctrl/Cmd+S saves now instead of downloading a file.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "s" || e.shiftKey) return;
      e.preventDefault();
      e.stopPropagation();
      void saveAndTell();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [saveAndTell]);

  const importFile = useCallback(
    async (file: File) => {
      if (!api) return;
      try {
        const scene = await loadFromBlob(file, null, null);
        const elements = scene.elements.filter((el) => !el.isDeleted);
        if (scene.files) api.addFiles(Object.values(scene.files));
        const placed = insertElements(api, elements);
        api.scrollToContent(placed, { fitToViewport: true, viewportZoomFactor: 0.8, animate: true });
      } catch {
        toast.error("เปิดไฟล์นี้ไม่ได้ ใช้ไฟล์ .excalidraw หรือ PNG ที่ส่งออกจากบอร์ด");
      }
    },
    [api],
  );

  const duplicate = useCallback(async () => {
    try {
      const { id } = await boardApi<{ id: string }>(`/api/whiteboards/${board.id}/duplicate`, { method: "POST", body: "{}" });
      window.open(`/whiteboard/${id}`, "_blank");
    } catch {
      toast.error("คัดลอกไม่สำเร็จ · Could not copy");
    }
  }, [board.id]);

  const onVersionsChanged = useCallback((fn: () => void) => syncOn("versions", fn), [syncOn]);
  const onVersionSaved = useCallback(() => syncSend("versions", {}), [syncSend]);
  const openShare = useCallback(() => setShareOpen(true), []);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const onPlace = useMemo(
    () =>
      editable && api
        ? (plugin: BoardPlugin) => {
            if (plugin.widget) insertWidget(api, widgetLink(plugin.id), plugin.widget);
          }
        : undefined,
    [api, editable],
  );

  const renderEmbeddable = useCallback(
    (element: NonDeleted<ExcalidrawEmbeddableElement>) => {
      const widget = widgetIdOf(element.link);
      if (!widget || !api) return null;
      return (
        <BoardWidget
          pluginId={widget}
          api={api}
          board={boardInfo}
          editable={editable}
          me={pluginMe}
          players={players}
          channel={channel}
        />
      );
    },
    [api, boardInfo, editable, pluginMe, players, channel],
  );

  // Quest leads: the owner and site admins, plus whoever the owner made staff. They make
  // quests (only their "Quest" text counts) and see everyone's work in the Quest dashboard.
  const questLeads = useMemo(
    () => new Set([...managerIds, ...members.filter((m) => m.questReviewer).map((m) => m.userId)]),
    [managerIds, members],
  );
  const canReviewQuests = questLeads.has(me.id);

  // Excalidraw re-renders itself whenever its children change, so they are memoized
  // on exactly what they read.
  const mainMenu = useMemo(
    () => (
      <MainMenu>
        <MainMenu.Item icon={<ArrowLeft size={16} />} onSelect={() => (window.location.href = "/whiteboard")}>
          บอร์ดทั้งหมด · All boards
        </MainMenu.Item>
        <MainMenu.Separator />
        {editable && (
          // Touch devices have no Ctrl+S.
          <MainMenu.Item icon={<Save size={16} />} shortcut="Ctrl+S" onSelect={() => void saveAndTell()}>
            บันทึกตอนนี้ · Save now
          </MainMenu.Item>
        )}
        <MainMenu.Item icon={<Copy size={16} />} onSelect={() => void duplicate()}>
          ทำสำเนา · Make a copy
        </MainMenu.Item>
        {editable && (
          <MainMenu.Item icon={<FileUp size={16} />} onSelect={() => importInput.current?.click()}>
            นำเข้าไฟล์ · Import
          </MainMenu.Item>
        )}
        <MainMenu.DefaultItems.SaveAsImage />
        <MainMenu.DefaultItems.Export />
        <MainMenu.DefaultItems.SearchMenu />
        <MainMenu.DefaultItems.Help />
        {editable && <MainMenu.DefaultItems.ClearCanvas />}
        <MainMenu.Separator />
        <MainMenu.DefaultItems.ToggleTheme />
        {/* The canvas colour and the dot grid: the one place for them (Excalidraw's own picker is left out). */}
        <MainMenu.Item icon={<Settings size={16} />} onSelect={openSettings}>
          ตั้งค่าบอร์ด · Board settings
        </MainMenu.Item>
      </MainMenu>
    ),
    [api, duplicate, editable, openSettings, saveAndTell],
  );

  const welcomeScreen = useMemo(
    () => (
      <WelcomeScreen>
        <WelcomeScreen.Hints.MenuHint />
        <WelcomeScreen.Center>
          <WelcomeScreen.Center.Heading>{title}</WelcomeScreen.Center.Heading>
          <WelcomeScreen.Center.Menu>
            {editable && (
              <WelcomeScreen.Center.MenuItem
                onSelect={() => api && openKit(api, "templates")}
                icon={<LayoutTemplate size={16} />}
              >
                เริ่มจากเทมเพลต · Start from a template
              </WelcomeScreen.Center.MenuItem>
            )}
            <WelcomeScreen.Center.MenuItem onSelect={openShare}>ชวนเพื่อนมาวาดด้วยกัน · Invite friends</WelcomeScreen.Center.MenuItem>
            <WelcomeScreen.Center.MenuItemHelp />
          </WelcomeScreen.Center.Menu>
        </WelcomeScreen.Center>
      </WelcomeScreen>
    ),
    [api, editable, openShare, title],
  );

  const activity = useMemo(
    () =>
      isAdmin && api ? (
        <ActivityPanel api={api} boardId={board.id} showAuthors={showAuthors} onShowAuthors={setShowAuthors} onPeople={setAuthorNames} />
      ) : undefined,
    [api, board.id, isAdmin, showAuthors],
  );

  // The Quest dashboard, in a pane beside the board that the board makes room for.
  const questPane = useQuestPane(board.id, canReviewQuests);
  const openQuestDashboard = useCallback((questId: string) => openQuestPanel(questId), []);
  // Staff: the Mentor dashboard, beside the timer. Pressed while the pane is open.
  const { open: mentorOpen, close: closeMentor } = questPane;
  const mentorButton = useMemo(
    () =>
      canReviewQuests && api ? (
        <button
          type="button"
          onClick={() => (mentorOpen ? closeMentor() : openQuestPanel())}
          aria-pressed={mentorOpen}
          aria-label="Mentor Dashboard · งานของนักเรียน"
          data-tip="Mentor Dashboard · งานของนักเรียน"
          data-tip-side="bottom"
          className={`wb-timer ${mentorOpen ? "wb-timer--running" : ""}`}
        >
          <GraduationCap className="h-4 w-4" aria-hidden />
        </button>
      ) : null,
    [api, canReviewQuests, mentorOpen, closeMentor],
  );

  const kit = useMemo(
    () =>
      api ? (
        <KitSidebar
          api={api}
          boardId={board.id}
          editable={editable}
          myName={me.name}
          comments={comments}
          showResolved={showResolved}
          onShowResolved={setShowResolved}
          onOpenThread={setOpenThread}
          saveNow={saveNow}
          refreshFiles={refreshFiles}
          onVersionSaved={onVersionSaved}
          onVersionsChanged={onVersionsChanged}
          activity={activity}
        />
      ) : null,
    [api, board.id, editable, me.name, comments, showResolved, saveNow, refreshFiles, onVersionSaved, onVersionsChanged, activity],
  );

  const timer = useMemo(
    () => <TimerWidget boardId={board.id} initial={board.timer} canControl={editable} channel={channel} />,
    // board.timer is only the starting value; the widget follows the channel after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [board.id, editable, channel],
  );

  const closePlacing = useCallback(() => setPlacingComment(false), []);

  return (
    <>
      <div
        ref={root}
        className={`whiteboard-root whiteboard-room fixed inset-0 ${WB_FONT_VARS}`}
        // The Quest pane sits beside the board: the board's right edge moves in to make room.
        style={questPane.open ? { right: questPane.width } : undefined}
      >
      {/* The grain filters, once for the whole board. */}
      <GrainDefs />
      <BoardBackdrop api={api} settings={settings} />
      <Excalidraw
        excalidrawAPI={sync.setExcalidrawAPI}
        initialData={initialData}
        onChange={onChange}
        onPointerUpdate={onPointerUpdate}
        isCollaborating
        viewModeEnabled={!editable}
        name={title}
        UIOptions={UI_OPTIONS}
        validateEmbeddable={validateEmbeddable}
        renderEmbeddable={renderEmbeddable}
      >
        {mainMenu}
        {welcomeScreen}
        {kit}
      </Excalidraw>

      {api && (
        <>
          <CommentsLayer
            api={api}
            comments={comments}
            meId={me.id}
            canModerate={editable}
            isOwner={board.role === "owner"}
            placing={placingComment}
            onPlaced={closePlacing}
            openId={openThread}
            onOpen={setOpenThread}
            showResolved={showResolved}
          />
          <EmoteLayer api={api} bursts={emotes.bursts} />
          {editable && <ZoneAddLayer api={api} meId={me.id} manager={isManager} />}
          {editable && (
            <QuestLayer
              api={api}
              meId={me.id}
              manager={canReviewQuests}
              leads={questLeads}
              nameOf={nameOf}
              onReview={canReviewQuests ? openQuestDashboard : undefined}
              session={quest.session}
              onStart={startQuest}
              onEnd={endQuest}
            />
          )}
          {editable && <QuestMenu api={api} meId={me.id} manager={canReviewQuests} leads={questLeads} />}
          <CardVersionsLayer api={api} meId={me.id} editable={editable} manager={isManager} nameOf={nameOf} />
          <CanvasTeamLayer
            api={api}
            meId={me.id}
            manager={isManager}
            people={people}
            nameOf={nameOf}
            onInvite={board.role === "owner" ? openShare : undefined}
          />
          {isAdmin && showAuthors && <AuthorsLayer api={api} nameOf={nameOf} />}
        </>
      )}

      {/* Our chrome sits above the canvas and the comment overlay, under Excalidraw's own menus. */}
      <BoardCorner
        boardId={board.id}
        title={title}
        canRename={board.role === "owner"}
        onRenamed={setTitle}
        saveState={sync.saveState}
        connected={sync.connected}
        readOnly={!editable}
      />
      <PeopleCorner api={api} present={sync.present} meId={me.id} timer={timer} mentor={mentorButton} onShare={openShare} />
      <BottomBar
        api={api}
        boardId={board.id}
        editable={editable}
        isAdmin={isAdmin}
        placingComment={placingComment}
        onPlacingComment={setPlacingComment}
        onReact={emotes.react}
        openWindows={windows.open}
        onToggleWindow={windows.toggle}
        onPlace={onPlace}
        onSettings={openSettings}
      />

      {api && (
        <PluginHost
          api={api}
          board={boardInfo}
          editable={editable}
          me={pluginMe}
          players={players}
          channel={channel}
          windows={windows}
        />
      )}

      <input
        ref={importInput}
        type="file"
        accept=".excalidraw,.json,image/png,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importFile(file);
          e.target.value = "";
        }}
      />

      <BoardSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} settings={settings} update={updateSettings} />

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        boardId={board.id}
        role={board.role}
        linkAccess={linkAccess}
        onLinkAccessChange={setLinkAccess}
        shareToken={shareToken}
        onShareTokenChange={setShareToken}
        members={people}
        onMembersChange={setMembers}
        onlineIds={onlineIds}
      />
      </div>
      {questPane.open && api && (
        <QuestPane
          api={api}
          width={questPane.width}
          onResize={questPane.resize}
          onClose={questPane.close}
          people={people}
          nameOf={nameOf}
          avatarOf={avatarOf}
          leads={questLeads}
          focus={questPane.focus}
          boardId={board.id}
          meId={me.id}
        />
      )}
    </>
  );
}
