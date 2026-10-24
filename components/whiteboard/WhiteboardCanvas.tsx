"use client";

import "@excalidraw/excalidraw/index.css";
import "./whiteboard.css";

import {
  Excalidraw,
  Footer,
  LiveCollaborationTrigger,
  loadFromBlob,
  MainMenu,
  restoreElements,
  Sidebar,
  WelcomeScreen,
} from "@excalidraw/excalidraw";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import { ArrowLeft, Copy, FileUp, LayoutTemplate, MessageCircle, PanelRight, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { WhiteboardDetail } from "@/lib/supabase/whiteboards";
import { canEdit, type LinkAccess } from "@/lib/whiteboard/core";
import { templateById } from "@/lib/whiteboard/templates";

import { BoardTitle, SaveBadge } from "./BoardChrome";
import { CommentsLayer } from "./CommentsLayer";
import { EmoteLayer, EmotePicker, useEmotes } from "./EmoteLayer";
import { insertElements, insertSkeletons } from "./insert";
import { KIT_SIDEBAR, KitSidebar } from "./KitSidebar";
import { ShareDialog } from "./ShareDialog";
import { TimerWidget } from "./TimerWidget";
import { useComments } from "./useComments";
import { boardApi, useWhiteboardSync } from "./useWhiteboardSync";

type Me = { id: string; name: string; avatarUrl: string | null };
type Theme = "light" | "dark";

const THEME_KEY = "whiteboard-theme";
// Thai faces registered in whiteboard.css under Excalidraw's family names.
const THAI_FONTS = ["Excalifont", "Nunito", "Comic Shanns"];

/** Loads the Thai faces up front so Thai text is measured with the right font. */
function preloadThaiFonts() {
  if (typeof document === "undefined" || !document.fonts) return;
  for (const family of THAI_FONTS) void document.fonts.load(`20px "${family}"`, "ก").catch(() => undefined);
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
  const initialElements = useMemo(
    () => restoreElements(board.elements as never, null) as readonly OrderedExcalidrawElement[],
    [board.elements],
  );
  const initialData = useMemo(() => {
    const theme = (typeof window !== "undefined" && (localStorage.getItem(THEME_KEY) as Theme | null)) || "light";
    return { elements: initialElements, appState: { theme }, scrollToContent: true };
  }, [initialElements]);

  const sync = useWhiteboardSync({ boardId: board.id, role: board.role, me, initialElements });
  const api = sync.excalidrawAPI;
  const channel = useMemo(() => ({ send: sync.send, on: sync.on }), [sync.send, sync.on]);
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
  const importInput = useRef<HTMLInputElement>(null);
  const theme = useRef<Theme>(initialData.appState.theme);
  // Excalidraw hands over its API before the initial scene loads; wait for the first change.
  const [sceneReady, setSceneReady] = useState(false);

  // People who opened the board since this page loaded also show up in the list.
  const people = useMemo(() => {
    const known = new Set(members.map((m) => m.userId));
    const newcomers = sync.present
      .filter((p) => !known.has(p.userId))
      .map((p) => ({ userId: p.userId, name: p.name, avatarUrl: p.avatarUrl, role: p.role }));
    return [...members, ...newcomers];
  }, [members, sync.present]);
  const onlineIds = useMemo(() => new Set(sync.present.map((p) => p.userId)), [sync.present]);

  const onChange = useCallback(
    (elements: readonly OrderedExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      if (appState.theme !== theme.current) {
        theme.current = appState.theme;
        localStorage.setItem(THEME_KEY, appState.theme);
      }
      if (!sceneReady) setSceneReady(true);
      sync.onChange(elements, appState, files);
    },
    [sceneReady, sync],
  );

  const onPointerUpdate = useCallback(
    (update: Parameters<typeof sync.onPointerUpdate>[0]) => {
      pointer.current = { x: update.pointer.x, y: update.pointer.y };
      sync.onPointerUpdate(update);
    },
    [sync],
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

  // Ctrl/Cmd+S saves now instead of downloading a file.
  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "s" || e.shiftKey) return;
      e.preventDefault();
      e.stopPropagation();
      if (!editable) return;
      const ok = await sync.saveNow();
      api?.setToast({ message: ok ? "บันทึกแล้ว · Saved" : "ยังบันทึกไม่ได้ จะลองใหม่ให้", duration: 1500 });
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [api, editable, sync]);

  const importFile = async (file: File) => {
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
  };

  const duplicate = async () => {
    try {
      const { id } = await boardApi<{ id: string }>(`/api/whiteboards/${board.id}/duplicate`, { method: "POST", body: "{}" });
      window.open(`/whiteboard/${id}`, "_blank");
    } catch {
      toast.error("คัดลอกไม่สำเร็จ · Could not copy");
    }
  };

  const syncOn = sync.on;
  const onVersionsChanged = useCallback((fn: () => void) => syncOn("versions", fn), [syncOn]);

  const openKit = (tab: string) => api?.toggleSidebar({ name: KIT_SIDEBAR, tab, force: true });

  return (
    <div className="whiteboard-root whiteboard-room fixed inset-0">
      <Excalidraw
        excalidrawAPI={sync.setExcalidrawAPI}
        initialData={initialData}
        onChange={onChange}
        onPointerUpdate={onPointerUpdate}
        onScrollChange={sync.onScrollChange}
        onUserFollow={sync.onUserFollow}
        isCollaborating
        viewModeEnabled={!editable}
        name={title}
        UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false } }}
        renderTopRightUI={(isMobile) => (
          <div className="flex items-center gap-2">
            {!isMobile && (
              <BoardTitle boardId={board.id} title={title} canRename={board.role === "owner"} onRenamed={setTitle} />
            )}
            <TimerWidget boardId={board.id} initial={board.timer} canControl={editable} channel={channel} />
            <SaveBadge state={sync.saveState} connected={sync.connected} readOnly={!editable} />
            <Sidebar.Trigger name={KIT_SIDEBAR} tab={editable ? "create" : "comments"} icon={<PanelRight size={16} />} title="Board kit" />
            <LiveCollaborationTrigger isCollaborating={sync.connected} onSelect={() => setShareOpen(true)} />
          </div>
        )}
      >
        <MainMenu>
          <MainMenu.Item icon={<ArrowLeft size={16} />} onSelect={() => (window.location.href = "/whiteboard")}>
            บอร์ดทั้งหมด · All boards
          </MainMenu.Item>
          <MainMenu.Separator />
          {editable && (
            <MainMenu.Item icon={<Save size={16} />} shortcut="Ctrl+S" onSelect={() => void sync.saveNow()}>
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
          {editable && (
            <MainMenu.Item icon={<LayoutTemplate size={16} />} onSelect={() => openKit("templates")}>
              เทมเพลต · Templates
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

        <WelcomeScreen>
          <WelcomeScreen.Hints.MenuHint />
          <WelcomeScreen.Hints.ToolbarHint />
          <WelcomeScreen.Center>
            <WelcomeScreen.Center.Heading>{title}</WelcomeScreen.Center.Heading>
            <WelcomeScreen.Center.Menu>
              {editable && (
                <WelcomeScreen.Center.MenuItem onSelect={() => openKit("templates")} icon={<LayoutTemplate size={16} />}>
                  เริ่มจากเทมเพลต · Start from a template
                </WelcomeScreen.Center.MenuItem>
              )}
              <WelcomeScreen.Center.MenuItem onSelect={() => setShareOpen(true)}>
                ชวนเพื่อนมาวาดด้วยกัน · Invite friends
              </WelcomeScreen.Center.MenuItem>
              <WelcomeScreen.Center.MenuItemHelp />
            </WelcomeScreen.Center.Menu>
          </WelcomeScreen.Center>
        </WelcomeScreen>

        <Footer>
          <div className="mx-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPlacingComment((p) => !p)}
              title="Comment: click anywhere on the board"
              className={`wb-pill text-sm ${placingComment ? "wb-pill--on" : ""}`}
            >
              <MessageCircle className="h-4 w-4" />
              {placingComment ? "คลิกบนบอร์ด" : "คอมเมนต์"}
            </button>
            <EmotePicker onPick={emotes.react} />
          </div>
        </Footer>

        {api && (
          <KitSidebar
            api={api}
            boardId={board.id}
            editable={editable}
            comments={comments}
            showResolved={showResolved}
            onShowResolved={setShowResolved}
            onOpenThread={setOpenThread}
            saveNow={sync.saveNow}
            refreshFiles={sync.refreshFiles}
            onVersionSaved={() => sync.send("versions", {})}
            onVersionsChanged={onVersionsChanged}
          />
        )}
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
            onPlaced={() => setPlacingComment(false)}
            openId={openThread}
            onOpen={setOpenThread}
            showResolved={showResolved}
          />
          <EmoteLayer api={api} bursts={emotes.bursts} />
        </>
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
