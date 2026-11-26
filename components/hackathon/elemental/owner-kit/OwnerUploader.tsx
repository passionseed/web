"use client";

import { useEffect, useRef, useState } from "react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import type { OwnerElement } from "@/lib/hackathon/elemental/owner-link";
import { formatFileSize, OWNER_UPLOAD_ACCEPT } from "@/lib/hackathon/elemental/owner-upload";

type Item = {
  id: number;
  file: File;
  status: "waiting" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
};

function put(url: string, file: File, contentType: string, onProgress: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`อัปโหลดไม่สำเร็จ (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("เน็ตหลุดระหว่างอัปโหลด ลองอีกครั้ง"));
    xhr.send(file);
  });
}

/**
 * The owner kit's upload form. Each file goes straight from the phone to B2
 * on a presigned PUT from /api/hackathon/elemental/owner-upload, one at a
 * time, with a progress bar.
 */
export function OwnerUploader({ org, element, signature }: { org: string; element: OwnerElement | null; signature: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const nextId = useRef(1);

  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  const update = (id: number, patch: Partial<Item>) => setItems((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const add = (files: FileList | null) => {
    if (!files) return;
    const added = Array.from(files).map((file) => ({ id: nextId.current++, file, status: "waiting" as const, progress: 0 }));
    setItems((list) => [...list, ...added]);
  };

  const start = async () => {
    setBusy(true);
    const uploaded: string[] = [];
    for (const it of items.filter((i) => i.status === "waiting" || i.status === "error")) {
      update(it.id, { status: "uploading", progress: 0, error: undefined });
      try {
        const res = await fetch("/api/hackathon/elemental/owner-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ o: org, el: element, s: signature, fileName: it.file.name, fileType: it.file.type, fileSize: it.file.size }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "อัปโหลดไม่สำเร็จ");
        await put(data.uploadUrl, it.file, data.contentType, (p) => update(it.id, { progress: p }));
        update(it.id, { status: "done", progress: 1 });
        uploaded.push(data.key);
      } catch (error) {
        update(it.id, { status: "error", error: error instanceof Error ? error.message : "อัปโหลดไม่สำเร็จ" });
      }
    }
    setBusy(false);
    // Tell the team on Discord. The owner's files are safe either way, so a failure here stays silent.
    if (uploaded.length > 0) {
      fetch("/api/hackathon/elemental/owner-upload/done", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ o: org, el: element, s: signature, keys: uploaded }),
        keepalive: true,
      }).catch(() => {});
    }
  };

  const pending = items.filter((i) => i.status === "waiting" || i.status === "error").length;
  const done = items.filter((i) => i.status === "done").length;

  return (
    <div>
      <label
        className="flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed px-4 py-8 text-center"
        style={{ borderColor: "rgba(243,239,230,0.45)", fontFamily: EL_FONT.display }}
      >
        <span style={{ fontSize: 22, fontWeight: 400 }}>เลือกคลิป รูป หรือ PDF</span>
        <span style={{ fontSize: 16, fontWeight: 300, color: EL.creamSoft }}>เลือกได้ทีละหลายไฟล์ ไฟล์ละไม่เกิน 2 GB</span>
        <input type="file" multiple accept={OWNER_UPLOAD_ACCEPT} className="sr-only" disabled={busy} onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      </label>

      {items.length > 0 && (
        <ul className="mt-4 space-y-3">
          {items.map((it) => (
            <li key={it.id} style={{ borderTop: "1px solid rgba(243,239,230,0.28)", paddingTop: 10 }}>
              <div className="flex items-baseline justify-between gap-3" style={{ fontFamily: EL_FONT.display, fontSize: 17, fontWeight: 300 }}>
                <span className="min-w-0 truncate">{it.file.name}</span>
                <span className="flex-none" style={{ fontFamily: EL_FONT.mono, fontSize: 13, color: it.status === "error" ? EL.flame : it.status === "done" ? EL.toxicCyan : EL.creamSoft }}>
                  {it.status === "done" ? "ได้รับแล้ว" : it.status === "uploading" ? `${Math.round(it.progress * 100)}%` : it.status === "error" ? "ไม่สำเร็จ" : formatFileSize(it.file.size)}
                </span>
              </div>
              <div className="mt-2 h-1" style={{ background: "rgba(243,239,230,0.18)" }}>
                <div className="h-full transition-[width]" style={{ width: `${it.progress * 100}%`, background: it.status === "error" ? EL.flame : EL.cream }} />
              </div>
              {it.error && <p className="mt-1" style={{ fontFamily: EL_FONT.display, fontSize: 15, color: EL.flame }}>{it.error}</p>}
            </li>
          ))}
        </ul>
      )}

      <label className="mt-5 flex cursor-pointer items-start gap-3" style={{ fontFamily: EL_FONT.display, fontSize: 17, fontWeight: 300, lineHeight: 1.5 }}>
        <input type="checkbox" className="mt-1.5 h-4 w-4 flex-none accent-[#f3efe6]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          อนุญาตให้ PassionSeed ใช้คลิปและรูปเหล่านี้บนเว็บและโซเชียลของ Elemental Hackathon และในห้องเรียนของงาน
        </span>
      </label>

      <button
        type="button"
        onClick={start}
        disabled={!consent || pending === 0 || busy}
        className="mt-5 w-full px-5 py-4 disabled:opacity-40"
        style={{ background: EL.cream, color: EL.ink, fontFamily: EL_FONT.display, fontSize: 20, fontWeight: 400 }}
      >
        {busy ? "กำลังอัปโหลด อย่าเพิ่งปิดหน้านี้" : pending > 0 ? `อัปโหลด ${pending} ไฟล์` : done > 0 ? "อัปโหลดครบแล้ว" : "อัปโหลด"}
      </button>

      {done > 0 && !busy && pending === 0 && (
        <p className="mt-4" style={{ fontFamily: EL_FONT.display, fontSize: 18, fontWeight: 300, color: EL.toxicCyan }}>
          ได้รับครบ {done} ไฟล์แล้ว ขอบคุณมาก ทีมงานจะติดต่อกลับถ้ามีอะไรเพิ่ม
        </p>
      )}
    </div>
  );
}
