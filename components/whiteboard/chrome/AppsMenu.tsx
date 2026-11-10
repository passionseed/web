"use client";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Activity, History, LayoutTemplate, MessagesSquare, ScrollText, Sticker, Ticket } from "lucide-react";
import type { ReactNode } from "react";

import { KIT_CARDS_ID, openKit, type KitTab } from "../KitSidebar";
import { APP_PLUGINS, GAME_PLUGINS, PluginRows } from "../plugins/PluginMenu";
import type { BoardPlugin } from "../plugins/types";

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="wb-menu-section" aria-label={label}>
      <p className="wb-popover__label">{label}</p>
      {children}
    </section>
  );
}

function Row({
  icon,
  name,
  hint,
  on,
  onClick,
}: {
  icon: ReactNode;
  name: string;
  hint?: string;
  on?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button type="button" role="menuitem" onClick={onClick} className={`wb-row ${on ? "wb-row--on" : ""}`}>
      <span className="wb-row__icon">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{name}</span>
        {hint && <span className="block text-xs opacity-60">{hint}</span>}
      </span>
    </button>
  );
}

/**
 * Everything that is not on the bottom bar, like FigJam's plugin menu: games,
 * board apps, and the board kit (templates, stickers, room cards, comments,
 * history, activity) plus the speaker script.
 */
export function AppsMenu({
  api,
  editable,
  isAdmin,
  openWindows,
  onToggleWindow,
  onPlace,
  script,
  onDone,
}: {
  api: ExcalidrawImperativeAPI | null;
  editable: boolean;
  isAdmin: boolean;
  openWindows: Record<string, unknown>;
  onToggleWindow: (id: string) => void;
  onPlace?: (plugin: BoardPlugin) => void;
  script: { isOpen: boolean; toggle: (popup: boolean) => void };
  onDone: () => void;
}) {
  const kit = (tab: KitTab, section?: string) => () => {
    if (api) openKit(api, tab, section);
    onDone();
  };

  return (
    <div className="wb-apps" role="menu" aria-label="แอปและเครื่องมือ · Apps and tools">
      {GAME_PLUGINS.length > 0 && (
        <Section label="เกม · Games">
          <PluginRows plugins={GAME_PLUGINS} open={openWindows} onToggle={onToggleWindow} onPlace={onPlace} onDone={onDone} />
        </Section>
      )}
      {APP_PLUGINS.length > 0 && (
        <Section label="แอป · Apps">
          <PluginRows plugins={APP_PLUGINS} open={openWindows} onToggle={onToggleWindow} onPlace={onPlace} onDone={onDone} />
        </Section>
      )}
      <Section label="บอร์ด · Board">
        {editable && (
          <>
            <Row icon={<LayoutTemplate className="h-4 w-4" />} name="เทมเพลต · Templates" hint="เช็กอิน ระดมไอเดีย รีโทร คัมบัง" onClick={kit("templates")} />
            <Row icon={<Sticker className="h-4 w-4" />} name="สติกเกอร์และแสตมป์ · Stickies and stamps" hint="โน้ตทุกสี แสตมป์ไว้โหวต" onClick={kit("create")} />
            <Row icon={<Ticket className="h-4 w-4" />} name="การ์ดห้อง · Room cards" hint="มาถึงแล้ว ขอความเห็น ช่วยได้ ปิดท้าย" onClick={kit("create", KIT_CARDS_ID)} />
          </>
        )}
        <Row icon={<MessagesSquare className="h-4 w-4" />} name="คอมเมนต์ทั้งหมด · All comments" onClick={kit("comments")} />
        <Row icon={<History className="h-4 w-4" />} name="ประวัติ · Version history" hint="ย้อนกลับไปเวอร์ชันก่อน หรือทำสำเนา" onClick={kit("history")} />
        {isAdmin && <Row icon={<Activity className="h-4 w-4" />} name="ใครทำอะไร · Activity" hint="เห็นเฉพาะแอดมิน" onClick={kit("activity")} />}
        {/* Private to this browser, so viewers who present get it too. */}
        <Row
          icon={<ScrollText className="h-4 w-4" />}
          name="สคริปต์ · Speaker script"
          hint={script.isOpen ? "เปิดอยู่ กดเพื่อปิด" : "เห็นคนเดียว ไม่ติดไปตอนแชร์แท็บ · Shift-click เปิดเป็นป๊อปอัป"}
          on={script.isOpen}
          onClick={(e) => {
            script.toggle(e.shiftKey);
            onDone();
          }}
        />
      </Section>
    </div>
  );
}
