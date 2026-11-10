"use client";

import "@excalidraw/excalidraw/index.css";
import "./whiteboard.css";

import { convertToExcalidrawElements, Excalidraw, loadFromBlob, MainMenu, restoreElements, WelcomeScreen } from "@excalidraw/excalidraw";
import type { NonDeleted, OrderedExcalidrawElement, ExcalidrawEmbeddableElement } from "@excalidraw/excalidraw/element/types";
import type { AppState, BinaryFiles, ExcalidrawProps } from "@excalidraw/excalidraw/types";
import { ArrowLeft, Copy, FileUp, LayoutTemplate, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { WhiteboardDetail } from "@/lib/supabase/whiteboards";
import { canEdit, type LinkAccess } from "@/lib/whiteboard/core";
import { CARD_KINDS, CARDS, cardSkeleton } from "@/lib/whiteboard/cards";
import { templateById } from "@/lib/whiteboard/templates";
import { widgetIdOf, widgetLink } from "@/lib/whiteboard/widgets";

import { ActivityPanel } from "./ActivityPanel";
import { AuthorsLayer } from "./AuthorsLayer";
import { BoardCorner } from "./chrome/BoardCorner";
import { BottomBar } from "./chrome/BottomBar";
import { PeopleCorner } from "./chrome/PeopleCorner";
import { CommentsLayer } from "./CommentsLayer";
import { EmoteLayer, useEmotes } from "./EmoteLayer";
import { insertElements, insertSkeletons, insertWidget } from "./insert";
import { KitSidebar, openKit } from "./KitSidebar";
import { BoardWidget } from "./plugins/BoardWidget";
import { PluginHost, usePluginWindows } from "./plugins/PluginHost";
import type { BoardPlugin } from "./plugins/types";
import { ShareDialog } from "./ShareDialog";
import { TimerWidget } from "./TimerWidget";
import { useComments } from "./useComments";
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

/** Room cards in the Library panel, so people can drag them onto any board. */
function cardLibrary() {
  return CARD_KINDS.map((kind) => ({
    id: `passionseed-card-${kind}`,
    status: "published" as const,
    name: CARDS[kind].title,
    created: 0,
    elements: convertToExcalidrawElements([cardSkeleton(kind)]),
  }));
}

/** The live editor: Excalidraw plus sync, stickies, comments, reactions, timer, history and sharing. */
export default function WhiteboardCanvas({
  board,
  me,
  templateId,
}: {
  board: WhiteboardDetail;
  me: Me;
  templateId?: string | null;
}) {
  const editable = canEdit(board.role);
  const isAdmin = Boolean(me.isAdmin);
  const initialElements = useMemo(
    () => restoreElements(board.elements as never, null) as readonly OrderedExcalidrawElement[],
    [board.elements],
  );
  const initialData = useMemo(() => {
    const theme = (typeof window !== "undefined" && (localStorage.getItem(THEME_KEY) as Theme | null)) || "light";
    return { elements: initialElements, appState: { theme }, scrollToContent: true, libraryItems: cardLibrary() };
  }, [initialElements]);

  const sync = useWhiteboardSync({ boardId: board.id, role: board.role, me, initialElements });
  const api = sync.excalidrawAPI;
  const { send: syncSend, on: syncOn, onChange: syncOnChange, onPointerUpdate: syncOnPointer, saveNow, refreshFiles } = sync;
  const channel = useMemo(() => ({ send: syncSend, on: syncOn }), [syncSend, syncOn]);
  const comments = useComments(board.id, channel);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const emotes = useEmotes(api, channel, pointer);

  const [title, setTitle] = useState(board.title);
  const [shareOpen, setShareOpen] = useState(false);
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
  const theme = useRef<Theme>(initialData.appState.theme);
  // Excalidraw hands over its API before the initial scene loads; wait for the first change.
  const [sceneReady, setSceneReady] = useState(false);

  // People who opened the board since this page loaded also show up in the list.
  const people = useMemo(() => {
    const known = new Set(members.map((m) => m.userId));
    // One entry per person, even with several tabs open.
    const newcomers = sync.present
      .filter((p) => !known.has(p.userId) && Boolean(known.add(p.userId)))
      .map((p) => ({ userId: p.userId, name: p.name, avatarUrl: p.avatarUrl, role: p.role }));
    return [...members, ...newcomers];
  }, [members, sync.present]);
  const namesById = useMemo(() => new Map(people.map((p) => [p.userId, p.name])), [people]);
  const nameOf = useCallback((id: string) => namesById.get(id) ?? authorNames[id] ?? "Someone", [namesById, authorNames]);
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
        <MainMenu.DefaultItems.ChangeCanvasBackground />
      </MainMenu>
    ),
    [duplicate, editable, saveAndTell],
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

  const kit = useMemo(
    () =>
      api ? (
        <KitSidebar
          api={api}
          boardId={board.id}
          editable={editable}
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
    [api, board.id, editable, comments, showResolved, saveNow, refreshFiles, onVersionSaved, onVersionsChanged, activity],
  );

  const timer = useMemo(
    () => <TimerWidget boardId={board.id} initial={board.timer} canControl={editable} channel={channel} />,
    // board.timer is only the starting value; the widget follows the channel after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [board.id, editable, channel],
  );

  const closePlacing = useCallback(() => setPlacingComment(false), []);

  return (
    <div className="whiteboard-root whiteboard-room fixed inset-0">
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
      <PeopleCorner api={api} present={sync.present} meId={me.id} timer={timer} onShare={openShare} />
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
  );
}
