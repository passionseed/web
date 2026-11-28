"use client";

import { type Ref, useEffect, useRef, useState } from "react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import type { OwnerElement } from "@/lib/hackathon/elemental/owner-link";
import {
  checkOwnerUpload,
  formatFileSize,
  OWNER_UPLOAD_ACCEPT_MEDIA,
  OWNER_UPLOAD_ACCEPT_PDF,
} from "@/lib/hackathon/elemental/owner-upload";

import { keep } from "./keep";
import { PixelTick } from "./PixelArt";
import { KIT } from "./tokens";

type Item = {
  id: number;
  file: File;
  /** "rejected" failed the size or type check on pick and is never sent. */
  status: "waiting" | "uploading" | "done" | "error" | "rejected";
  progress: number;
  error?: string;
};

/** What this device has already sent on this link, kept in localStorage so a reopened link shows it. */
type Receipt = { sent: { name: string; size: number; at: string }[]; unfinished: boolean };

const RULE = "1px solid rgba(243,239,230,0.28)";

/**
 * The consent checkboxes, drawn by us: Chromium's dark native box is a grey hairline that
 * vanishes on the plate outdoors, and LINE's iOS web view draws its own. A 26px box with a
 * 2px cream border reads everywhere; the native input stays for semantics, keyboard and focus.
 */
function Box({
  checked,
  onChange,
  inputRef,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  inputRef?: Ref<HTMLInputElement>;
}) {
  return (
    <span className="relative mt-0.5 flex h-[26px] w-[26px] flex-none">
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-full w-full cursor-pointer appearance-none border-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          borderColor: checked ? EL.cream : "rgba(243,239,230,0.85)",
          background: checked ? EL.cream : KIT.panel,
          outlineColor: EL.cream,
        }}
      />
      {checked && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ color: EL.char }}>
          <PixelTick good size={16} />
        </span>
      )}
    </span>
  );
}
/** Abort a PUT when no bytes move for this long, so a dead 4G connection doesn't freeze the bar forever. */
const STALL_MS = 45_000;

const receiptKey = (signature: string) => `elemental-owner-kit:${signature}`;

function readReceipt(signature: string): Receipt {
  try {
    const raw = window.localStorage.getItem(receiptKey(signature));
    const parsed = raw ? (JSON.parse(raw) as Partial<Receipt>) : null;
    return { sent: Array.isArray(parsed?.sent) ? parsed.sent : [], unfinished: parsed?.unfinished === true };
  } catch {
    return { sent: [], unfinished: false };
  }
}

function writeReceipt(signature: string, receipt: Receipt) {
  try {
    window.localStorage.setItem(receiptKey(signature), JSON.stringify(receipt));
  } catch {
    // Private mode or storage blocked: the receipt is a convenience only.
  }
}

/** A short Thai date ("28 พ.ย.") for a receipt line. */
function shortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" });
  } catch {
    return "";
  }
}

function put(url: string, file: File, contentType: string, onProgress: (loaded: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let last = Date.now();
    const stall = window.setInterval(() => {
      if (Date.now() - last > STALL_MS) {
        window.clearInterval(stall);
        xhr.abort();
        reject(new Error("เน็ตค้าง ไฟล์ไม่ขยับ ลองอีกครั้ง ถ้ามี Wi-Fi ใช้ Wi-Fi"));
      }
    }, 5_000);
    const finish = (fn: () => void) => {
      window.clearInterval(stall);
      fn();
    };
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      last = Date.now();
      onProgress(e.loaded);
    };
    xhr.onload = () =>
      finish(() => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`อัปโหลดไม่สำเร็จ (${xhr.status}) ลองอีกครั้ง`))));
    xhr.onerror = () => finish(() => reject(new Error("เน็ตหลุดระหว่างอัปโหลด ลองอีกครั้ง")));
    xhr.send(file);
  });
}

/** Keep the screen on while uploading, where the browser allows it. */
async function holdScreen(): Promise<{ release: () => Promise<void> } | null> {
  try {
    if ("wakeLock" in navigator) return await navigator.wakeLock.request("screen");
  } catch {
    // Not allowed here (in-app browsers, low battery): the copy already asks to keep the screen on.
  }
  return null;
}

/** Share the link with whoever films, or copy it. */
function ShareLink() {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ url });
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("คัดลอกลิงก์นี้", url);
    }
  };
  return (
    <div className="flex flex-col gap-3 pb-6 sm:flex-row sm:items-center sm:justify-between" style={{ borderBottom: RULE }}>
      <p className="max-w-[640px] text-[17px] leading-[1.65] [text-wrap:pretty]" style={{ fontWeight: 400 }}>
        {keep("ส่งต่อลิงก์นี้ให้คนที่ถ่ายได้เลย ไฟล์จะถึงทีมงานโดยตรง")}
      </p>
      <button
        type="button"
        onClick={share}
        className="min-h-[44px] flex-none px-4 py-2 text-[17px]"
        style={{ border: `1px solid ${EL.cream}`, color: EL.cream, fontWeight: 400 }}
      >
        {copied ? "คัดลอกแล้ว" : "ส่งต่อลิงก์"}
      </button>
    </div>
  );
}

/**
 * The owner kit's upload form. Each file goes straight from the phone to B2
 * on a presigned PUT from /api/hackathon/elemental/owner-upload, one at a
 * time, with a progress bar. A typed note goes up first as notes.txt through
 * the same flow, so the team's Discord ping lists it.
 */
export function OwnerUploader({ org, element, signature, due }: { org: string; element: OwnerElement | null; signature: string; due: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [note, setNote] = useState("");
  const [minors, setMinors] = useState(false);
  const [consent, setConsent] = useState(false);
  const [consentNudge, setConsentNudge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ranOnce, setRanOnce] = useState(false);
  const [receipt, setReceipt] = useState<Receipt>({ sent: [], unfinished: false });
  const nextId = useRef(1);
  const consentRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Read after mount: localStorage isn't there during server render.
    setReceipt(readReceipt(signature));
  }, [signature]);

  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  const update = (id: number, patch: Partial<Item>) => setItems((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id: number) => setItems((list) => list.filter((it) => it.id !== id));

  const add = (files: FileList | null) => {
    if (!files) return;
    const added: Item[] = Array.from(files).map((file) => {
      const check = checkOwnerUpload({ fileName: file.name, fileType: file.type, fileSize: file.size });
      return check.ok
        ? { id: nextId.current++, file, status: "waiting", progress: 0 }
        : { id: nextId.current++, file, status: "rejected", progress: 0, error: check.error };
    });
    setItems((list) => [...list, ...added]);
  };

  const pendingFiles = items.filter((i) => i.status === "waiting" || i.status === "error");
  const failed = items.filter((i) => i.status === "error").length;
  const done = items.filter((i) => i.status === "done").length;
  const hasNote = note.trim().length > 0;
  const toSend = pendingFiles.length + (hasNote ? 1 : 0);

  const start = async () => {
    if (busy || toSend === 0) return;
    if (!consent) {
      setConsentNudge(true);
      consentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      consentRef.current?.focus({ preventScroll: true });
      return;
    }

    const queue = [...pendingFiles];
    if (hasNote) {
      // A BOM so a browser opens the Thai text as UTF-8.
      const file = new File(["\uFEFF" + note.trim() + "\n"], "notes.txt", { type: "text/plain" });
      const noteItem: Item = { id: nextId.current++, file, status: "waiting", progress: 0 };
      queue.unshift(noteItem);
      setItems((list) => [noteItem, ...list]);
      setNote("");
    }

    setBusy(true);
    setRanOnce(true);
    const lock = await holdScreen();
    let current = readReceipt(signature);
    writeReceipt(signature, { ...current, unfinished: true });
    const uploaded: string[] = [];

    for (const it of queue) {
      update(it.id, { status: "uploading", progress: 0, error: undefined });
      try {
        let res: Response;
        try {
          res = await fetch("/api/hackathon/elemental/owner-upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ o: org, el: element, s: signature, fileName: it.file.name, fileType: it.file.type, fileSize: it.file.size }),
          });
        } catch {
          throw new Error("เน็ตหลุด ลองอีกครั้ง");
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "อัปโหลดไม่สำเร็จ ลองอีกครั้ง");
        await put(data.uploadUrl, it.file, data.contentType, (loaded) => update(it.id, { progress: Math.min(1, loaded / it.file.size) }));
        update(it.id, { status: "done", progress: 1 });
        uploaded.push(data.key);
        current = { ...current, sent: [...current.sent, { name: it.file.name, size: it.file.size, at: new Date().toISOString() }] };
        writeReceipt(signature, { ...current, unfinished: true });
      } catch (error) {
        update(it.id, { status: "error", error: error instanceof Error ? error.message : "อัปโหลดไม่สำเร็จ ลองอีกครั้ง" });
      }
    }

    writeReceipt(signature, { ...current, unfinished: false });
    await lock?.release().catch(() => {});
    setBusy(false);
    // Tell the team on Discord. The owner's files are safe either way, so a failure here stays silent.
    if (uploaded.length > 0) {
      fetch("/api/hackathon/elemental/owner-upload/done", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ o: org, el: element, s: signature, keys: uploaded, minors }),
        keepalive: true,
      }).catch(() => {});
    }
  };

  const label = busy
    ? "กำลังอัปโหลด อย่าเพิ่งปิดหน้านี้"
    : failed > 0 && failed === toSend
      ? `ลองส่ง ${failed} ไฟล์ที่ไม่สำเร็จอีกครั้ง`
      : toSend > 0
        ? pendingFiles.length === 0
          ? "ส่งข้อความ"
          : `อัปโหลด ${toSend} ไฟล์`
        : done > 0
          ? "อัปโหลดครบแล้ว"
          : "อัปโหลด";
  const idle = !busy && toSend === 0;

  return (
    <div style={{ fontFamily: EL_FONT.display }}>
      <ShareLink />

      {(receipt.sent.length > 0 || receipt.unfinished) && done === 0 && !busy && (
        <div className="mt-6 text-[16px] leading-[1.65]" style={{ fontWeight: 400, color: KIT.soft }}>
          {receipt.sent.length > 0 && (
            <>
              <p className="text-[17px]" style={{ color: KIT.ok }}>ส่งจากเครื่องนี้แล้ว {receipt.sent.length} ไฟล์ ส่งเพิ่มได้</p>
              <ul className="mt-1">
                {receipt.sent.slice(-5).map((f) => (
                  <li key={`${f.name}-${f.at}`} className="flex items-start gap-2">
                    <span className="line-clamp-2 min-w-0 [overflow-wrap:anywhere]">{f.name}</span>
                    <span className="flex-none">({shortDate(f.at)})</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {receipt.unfinished && <p className="mt-1 text-[17px] [text-wrap:pretty]" style={{ color: KIT.warn }}>{keep("ครั้งก่อนอัปโหลดไม่เสร็จ เลือกไฟล์ที่ยังไม่ขึ้นว่าได้รับแล้วอีกครั้ง")}</p>}
        </div>
      )}

      <label
        className="mt-6 flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed px-4 py-8 text-center focus-within:outline focus-within:outline-2 focus-within:outline-offset-4"
        style={{ borderColor: KIT.edge, outlineColor: EL.cream }}
      >
        <span style={{ fontSize: 22, fontWeight: 400 }}>เลือกคลิปหรือรูปจากคลังภาพ</span>
        <span style={{ fontSize: 17, fontWeight: 400, color: KIT.body, lineHeight: 1.65 }}>เลือกได้ทีละหลายไฟล์ ไฟล์ละไม่เกิน 2 GB</span>
        <input type="file" multiple accept={OWNER_UPLOAD_ACCEPT_MEDIA} className="sr-only" disabled={busy} onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      </label>
      <label className="mt-2 inline-flex min-h-[44px] cursor-pointer items-center text-[17px] focus-within:outline focus-within:outline-2" style={{ fontWeight: 400, color: KIT.body, outlineColor: EL.cream }}>
        <span style={{ textDecoration: "underline", textUnderlineOffset: 4 }}>หรือเลือกไฟล์ PDF</span>
        <input type="file" multiple accept={OWNER_UPLOAD_ACCEPT_PDF} className="sr-only" disabled={busy} onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      </label>

      {items.length > 0 && (
        <ul className="mt-3 space-y-3" aria-live="polite">
          {items.map((it) => {
            const removable = !busy && (it.status === "waiting" || it.status === "error" || it.status === "rejected");
            const color = it.status === "error" || it.status === "rejected" ? KIT.warn : it.status === "done" ? KIT.ok : KIT.soft;
            // Numbers (size, progress) stay in Space Mono; Thai states get Trirong at a readable size.
            const numeric = it.status === "uploading" || it.status === "waiting";
            return (
              <li key={it.id} style={{ borderTop: RULE, paddingTop: 10 }}>
                <div className="flex items-start justify-between gap-3" style={{ fontSize: 17, fontWeight: 400, lineHeight: 1.65 }}>
                  {/* Two lines, broken anywhere, so a long Thai filename stays recognisable instead of cut mid-word. */}
                  <span className="line-clamp-2 min-w-0 pt-2 [overflow-wrap:anywhere]">{it.file.name}</span>
                  <span className="flex min-h-11 flex-none items-center gap-1">
                    <span
                      style={
                        numeric
                          ? { fontFamily: EL_FONT.mono, fontSize: 15, color, fontVariantNumeric: "tabular-nums" }
                          : { fontFamily: EL_FONT.display, fontSize: 17, fontWeight: it.status === "done" ? 600 : 400, color }
                      }
                    >
                      {it.status === "done"
                        ? "ได้รับแล้ว"
                        : it.status === "uploading"
                          ? `${formatFileSize(it.progress * it.file.size)} / ${formatFileSize(it.file.size)} · ${Math.round(it.progress * 100)}%`
                          : it.status === "rejected"
                            ? "ส่งไม่ได้"
                            : it.status === "error"
                              ? "ไม่สำเร็จ"
                            : formatFileSize(it.file.size)}
                    </span>
                    {removable && (
                      <button
                        type="button"
                        onClick={() => remove(it.id)}
                        aria-label={`ลบ ${it.file.name}`}
                        className="flex h-11 min-w-[44px] items-center justify-center px-2 text-[16px]"
                        style={{ color: EL.cream, textDecoration: "underline", textUnderlineOffset: 3 }}
                      >
                        ลบ
                      </button>
                    )}
                  </span>
                </div>
                <div
                  className="mt-1 h-1"
                  style={{ background: "rgba(243,239,230,0.18)" }}
                  role="progressbar"
                  aria-label={it.file.name}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(it.progress * 100)}
                >
                  <div className="h-full transition-[width]" style={{ width: `${it.progress * 100}%`, background: it.status === "error" ? KIT.warn : EL.cream }} />
                </div>
                {it.error && <p className="mt-1 [text-wrap:pretty]" style={{ fontSize: 16, lineHeight: 1.65, fontWeight: 400, color: KIT.warn }}>{it.error}</p>}
              </li>
            );
          })}
        </ul>
      )}

      <label className="mt-7 block">
        <span className="text-[18px]" style={{ fontWeight: 400 }}>ข้อความถึงทีมงาน</span>{" "}
        <span className="text-[16px]" style={{ fontWeight: 400, color: KIT.soft }}>ถ้ามี</span>
        {/* The hint is visible helper text, not a placeholder, so it stays readable after typing starts. */}
        <span id="owner-note-hint" className="mt-1 block text-[16px] leading-[1.65] [text-wrap:pretty]" style={{ fontWeight: 400, color: KIT.soft }}>
          {keep("ชื่อและตำแหน่งคนเล่า ลิงก์เพจ หรือเรื่องที่อยากบอก")}
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={busy}
          rows={3}
          maxLength={4000}
          aria-describedby="owner-note-hint"
          className="mt-2 block w-full px-3 py-2.5 text-[17px] leading-[1.65] focus:outline focus:outline-2"
          style={{ background: KIT.panel, border: `1px solid ${KIT.edge}`, color: EL.cream, fontWeight: 400, outlineColor: EL.cream }}
        />
      </label>

      <label className="mt-5 flex min-h-[44px] cursor-pointer items-start gap-3 py-1" style={{ fontSize: 17, fontWeight: 400, lineHeight: 1.65 }}>
        <Box checked={minors} onChange={setMinors} />
        <span className="max-w-[640px] [text-wrap:pretty]">
          {keep("มีเด็กหรือนักเรียนเห็นหน้าในคลิป และผู้ปกครองอนุญาตเป็นลายลักษณ์อักษรแล้ว")}
          <span className="mt-0.5 block text-[16px]" style={{ color: KIT.soft }}>
            ถ่ายรูปใบอนุญาตแล้วอัปโหลดมาพร้อมคลิปได้
          </span>
        </span>
      </label>

      <label
        className="mt-3 flex min-h-[44px] cursor-pointer items-start gap-3 p-2"
        style={{ fontSize: 17, fontWeight: 400, lineHeight: 1.65, outline: consentNudge && !consent ? `2px solid ${KIT.warn}` : "none", outlineOffset: 2, marginLeft: -8, marginRight: -8 }}
      >
        <Box
          inputRef={consentRef}
          checked={consent}
          onChange={(v) => {
            setConsent(v);
            if (v) setConsentNudge(false);
          }}
        />
        <span className="max-w-[640px] [text-wrap:pretty]">
          อนุญาตให้ PassionSeed ใช้คลิปและรูปเหล่านี้บนเว็บและโซเชียลของ Elemental Hackathon และในห้องเรียนของงาน
          {consentNudge && !consent && (
            <span className="mt-2 block w-fit px-3 py-1.5 text-[17px]" style={{ color: KIT.warn, background: KIT.panel, fontWeight: 600 }} role="alert">
              ติ๊กอนุญาตก่อนอัปโหลด
            </span>
          )}
        </span>
      </label>

      <p className="mt-5 max-w-[640px] text-[17px] leading-[1.65] [text-wrap:pretty]" style={{ fontWeight: 400, color: KIT.body }}>
        ส่งภายใน {due} {keep("ระหว่างอัปโหลด เปิดหน้านี้ค้างไว้ อย่าล็อกจอหรือสลับแอปจนขึ้นว่าได้รับแล้ว ถ้ามี Wi-Fi ใช้ Wi-Fi")}
      </p>

      <button
        type="button"
        onClick={start}
        disabled={idle || busy}
        aria-busy={busy}
        className="mt-3 min-h-[56px] w-full px-5 py-4 disabled:cursor-not-allowed"
        style={
          idle
            ? // Nothing picked yet: a solid thin outline, readable but not a 40% ghost. Dashed lines belong only to the drop zone, so this never looks like a place to pick files.
              { background: "transparent", border: "1px solid rgba(243,239,230,0.45)", color: KIT.soft, fontSize: 20, fontWeight: 400 }
            : { background: EL.cream, border: `1px solid ${EL.cream}`, color: EL.ink, fontSize: 20, fontWeight: 400 }
        }
      >
        {label}
      </button>

      {ranOnce && !busy && failed > 0 && (
        <p className="mt-3 text-[17px] leading-[1.65]" style={{ fontWeight: 600, color: KIT.warn }}>
          ส่งแล้ว {done} ไฟล์ ไม่สำเร็จ {failed} ไฟล์
        </p>
      )}
      {done > 0 && !busy && toSend === 0 && (
        <p className="mt-4 text-[18px] leading-[1.65] [text-wrap:pretty]" style={{ fontWeight: 400, color: KIT.ok }}>
          ได้รับครบ {done} ไฟล์แล้ว ขอบคุณมาก มีรูปหรือคลิปเพิ่มส่งที่เดิมได้ทุกเมื่อ
        </p>
      )}
    </div>
  );
}
