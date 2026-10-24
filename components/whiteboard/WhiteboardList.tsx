"use client";

import { formatDistanceToNow } from "date-fns";
import { Copy, Loader2, MoreHorizontal, Pencil, PenLine, Plus, Search, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WhiteboardSummary } from "@/lib/supabase/whiteboards";
import { TEMPLATES, type TemplateId } from "@/lib/whiteboard/templates";

type Filter = "all" | "mine" | "shared";
type Sort = "recent" | "name";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "ทั้งหมด" },
  { id: "mine", label: "ของฉัน" },
  { id: "shared", label: "แชร์กับฉัน" },
];

async function call<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json" } });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? "Something went wrong");
  return body as T;
}

/** The signed-in person's boards: their own and ones friends shared. */
export function WhiteboardList({ boards: initial }: { boards: WhiteboardSummary[] }) {
  const router = useRouter();
  const [boards, setBoards] = useState(initial);
  const [creating, setCreating] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [renaming, setRenaming] = useState<WhiteboardSummary | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return boards
      .filter((b) => (filter === "mine" ? b.role === "owner" : filter === "shared" ? b.role !== "owner" : true))
      .filter((b) => !q || b.title.toLowerCase().includes(q) || b.ownerName.toLowerCase().includes(q))
      .sort((a, b) => (sort === "name" ? a.title.localeCompare(b.title, "th") : b.updatedAt.localeCompare(a.updatedAt)));
  }, [boards, filter, query, sort]);

  const create = async (template?: TemplateId) => {
    setCreating(template ?? "blank");
    try {
      const name = template ? TEMPLATES.find((t) => t.id === template)?.name.split(" · ")[0] : undefined;
      const { id } = await call<{ id: string }>("/api/whiteboards", {
        method: "POST",
        body: JSON.stringify(name ? { title: name } : {}),
      });
      router.push(template ? `/whiteboard/${id}?template=${template}` : `/whiteboard/${id}`);
    } catch {
      toast.error("สร้างบอร์ดไม่สำเร็จ · Could not create a board");
      setCreating(null);
    }
  };

  const duplicate = async (board: WhiteboardSummary) => {
    try {
      const { id } = await call<{ id: string }>(`/api/whiteboards/${board.id}/duplicate`, { method: "POST", body: "{}" });
      setBoards((list) => [
        { ...board, id, title: `${board.title} (copy)`, role: "owner", ownerName: "You", updatedAt: new Date().toISOString() },
        ...list,
      ]);
      toast.success("ทำสำเนาแล้ว · Copied");
    } catch {
      toast.error("คัดลอกไม่สำเร็จ · Could not copy");
    }
  };

  const remove = async (board: WhiteboardSummary) => {
    const owner = board.role === "owner";
    if (!window.confirm(owner ? `ลบ "${board.title}" สำหรับทุกคน?` : `ออกจาก "${board.title}"?`)) return;
    try {
      await call(`/api/whiteboards/${board.id}`, { method: "DELETE" });
      setBoards((list) => list.filter((b) => b.id !== board.id));
    } catch {
      toast.error("ไม่สำเร็จ ลองอีกครั้ง · Try again");
    }
  };

  const rename = async (board: WhiteboardSummary, title: string) => {
    setRenaming(null);
    if (!title.trim() || title === board.title) return;
    try {
      await call(`/api/whiteboards/${board.id}`, { method: "PATCH", body: JSON.stringify({ title: title.trim() }) });
      setBoards((list) => list.map((b) => (b.id === board.id ? { ...b, title: title.trim() } : b)));
    } catch {
      toast.error("เปลี่ยนชื่อไม่สำเร็จ · Could not rename");
    }
  };

  return (
    <main className="min-h-screen bg-[#0f0d1a] px-5 py-10 text-white sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">ไวท์บอร์ด</h1>
            <p className="mt-1 text-sm text-white/60">วาด คิด วางแผนกับเพื่อนแบบเรียลไทม์ บันทึกให้อัตโนมัติ</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setGalleryOpen(true)}
              className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white/80 hover:border-white/30 hover:text-white"
            >
              จากเทมเพลต
            </button>
            <button
              type="button"
              onClick={() => void create()}
              disabled={creating !== null}
              className="ei-button-dusk inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium"
            >
              {creating === "blank" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              บอร์ดใหม่ · New board
            </button>
          </div>
        </header>

        {boards.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="relative min-w-56 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาบอร์ด · Search"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm outline-none focus:border-orange-400/60"
              />
            </div>
            <div className="flex rounded-xl border border-white/10 p-0.5">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm ${filter === f.id ? "bg-white/10 text-white" : "text-white/60 hover:text-white"}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="rounded-xl border border-white/10 bg-[#0f0d1a] px-3 py-2 text-sm text-white/80"
            >
              <option value="recent">แก้ล่าสุด · Recent</option>
              <option value="name">ชื่อ · Name</option>
            </select>
          </div>
        )}

        {boards.length === 0 ? (
          <EmptyState onBlank={() => void create()} onTemplate={(id) => void create(id)} creating={creating} />
        ) : visible.length === 0 ? (
          <p className="py-20 text-center text-sm text-white/50">ไม่เจอบอร์ดที่ค้นหา</p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((board) => (
              <li key={board.id} className="ei-card group overflow-hidden">
                <Link href={`/whiteboard/${board.id}`} className="block">
                  <div className="aspect-[16/10] w-full bg-[#f8f7f4]">
                    {board.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={board.thumbnail} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-neutral-300">
                        <PenLine className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                </Link>
                <div className="flex items-start gap-2 p-4">
                  <Link href={`/whiteboard/${board.id}`} className="min-w-0 flex-1">
                    <p className="truncate font-medium">{board.title}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/50">
                      {board.role !== "owner" && <Users className="h-3 w-3" />}
                      {board.role === "owner" ? "ของคุณ" : `จาก ${board.ownerName}`}
                      <span aria-hidden>·</span>
                      {formatDistanceToNow(new Date(board.updatedAt), { addSuffix: true })}
                    </p>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger aria-label="Board options" className="rounded-md p-1 text-white/50 hover:bg-white/10 hover:text-white">
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {board.role === "owner" && (
                        <DropdownMenuItem onSelect={() => setRenaming(board)}>
                          <Pencil className="mr-2 h-4 w-4" /> เปลี่ยนชื่อ · Rename
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onSelect={() => void duplicate(board)}>
                        <Copy className="mr-2 h-4 w-4" /> ทำสำเนา · Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => void remove(board)} className="text-red-500">
                        <Trash2 className="mr-2 h-4 w-4" />
                        {board.role === "owner" ? "ลบบอร์ด · Delete" : "ออกจากบอร์ด · Leave"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-3xl border-white/10 bg-[#141120] text-white">
          <DialogHeader>
            <DialogTitle>เริ่มจากเทมเพลต · Templates</DialogTitle>
          </DialogHeader>
          <TemplateGrid onPick={(id) => void create(id)} creating={creating} />
        </DialogContent>
      </Dialog>

      <Dialog open={renaming !== null} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent className="max-w-sm border-white/10 bg-[#141120] text-white">
          <DialogHeader>
            <DialogTitle>เปลี่ยนชื่อบอร์ด</DialogTitle>
          </DialogHeader>
          {renaming && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void rename(renaming, new FormData(e.currentTarget).get("title") as string);
              }}
              className="flex gap-2"
            >
              <input
                name="title"
                autoFocus
                defaultValue={renaming.title}
                maxLength={120}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
              <button type="submit" className="ei-button-dusk px-4 text-sm">
                Save
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function TemplateGrid({ onPick, creating }: { onPick: (id: TemplateId) => void; creating: string | null }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {TEMPLATES.map((t) => (
        <button
          key={t.id}
          type="button"
          disabled={creating !== null}
          onClick={() => onPick(t.id)}
          className="ei-card flex flex-col items-start gap-2 p-4 text-left"
        >
          <span className="text-3xl">{creating === t.id ? <Loader2 className="h-8 w-8 animate-spin" /> : t.emoji}</span>
          <span className="text-sm font-medium">{t.name}</span>
          <span className="text-xs text-white/50">{t.description}</span>
        </button>
      ))}
    </div>
  );
}

function EmptyState({
  onBlank,
  onTemplate,
  creating,
}: {
  onBlank: () => void;
  onTemplate: (id: TemplateId) => void;
  creating: string | null;
}) {
  return (
    <div className="space-y-6">
      <button type="button" onClick={onBlank} className="ei-card flex w-full flex-col items-center justify-center gap-3 py-16 text-center">
        <PenLine className="h-8 w-8 text-orange-300" />
        <span className="text-lg font-medium">เริ่มบอร์ดแรกของคุณ</span>
        <span className="text-sm text-white/50">แล้วส่งลิงก์ให้เพื่อนมาวาดด้วยกัน</span>
      </button>
      <div>
        <p className="mb-3 text-sm text-white/60">หรือเริ่มจากเทมเพลต</p>
        <TemplateGrid onPick={onTemplate} creating={creating} />
      </div>
    </div>
  );
}
