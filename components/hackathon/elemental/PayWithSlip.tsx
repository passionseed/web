"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Download, ImageUp, Loader2, RotateCcw } from "lucide-react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { SHIFT_PAYMENT } from "@/lib/content/shift-cohort";
import { prepareSlip } from "@/lib/hackathon/elemental/slip-image";

import styles from "./join/join.module.css";
import { trackElemental } from "./track";

/**
 * Pay for a sign-up in two moves: scan the QR (the amount is already in it
 * when PROMPTPAY_ID is set), then hand over the slip: tap to pick it, drop
 * it, or paste it. The server checks it (RDCW or SlipOK) and answers right
 * away, and the page turns into the seat.
 */

type Result =
  | { result: "paid" }
  | { result: "review" }
  | { result: "retry"; delayMinutes?: number }
  | { result: "rejected"; reason: "duplicate" | "amount" | "receiver" | "unreadable" | "expired" };

function message(r: Result, amount: string): string | null {
  switch (r.result) {
    case "paid":
    case "review":
      return null;
    case "retry":
      return r.delayMinutes
        ? `ธนาคารยังส่งข้อมูลสลิปไม่ถึง ลองอัปโหลดอีกครั้งในอีก ${r.delayMinutes} นาที`
        : "ระบบธนาคารยังตรวจสลิปไม่ได้ตอนนี้ ลองอัปโหลดอีกครั้งในอีกไม่กี่นาที";
    case "rejected":
      return {
        duplicate: "สลิปนี้เคยถูกใช้ไปแล้ว ใช้สลิปจากการโอนครั้งใหม่นะ",
        amount: `ยอดในสลิปไม่ตรงกับ ${amount} โอนให้ตรงยอดแล้วอัปโหลดสลิปใหม่ ถ้าโอนผิดยอดไปแล้ว ทักไลน์ ${SHIFT_PAYMENT.lineId}`,
        receiver: `สลิปนี้ไม่ได้โอนเข้าบัญชีของ PassionSeed สแกน QR ด้านบนแล้วโอนใหม่ หรือทักไลน์ ${SHIFT_PAYMENT.lineId}`,
        unreadable: "อ่าน QR บนสลิปไม่ได้ ใช้รูปสลิปเต็ม ๆ จากแอปธนาคาร ไม่ครอปและไม่แคปหน้าจอซ้อน",
        expired: "ตรวจสลิปนี้ไม่ได้ ใช้สลิปล่าสุดจากแอปธนาคาร",
      }[r.reason];
  }
}

/**
 * Save the QR to the phone's photos so a bank app can scan it. A plain
 * download link lands in Files on iOS browsers (Arc, Safari), where bank apps
 * can't see it; the share sheet has "Save Image", which goes to Photos.
 */
function SaveQrButton({ src }: { src: string }) {
  const qrFile = useRef<File | null>(null);
  useEffect(() => {
    fetch(src)
      .then((res) => res.blob())
      .then((blob) => {
        const ext = blob.type === "image/png" ? "png" : "jpg";
        qrFile.current = new File([blob], `passionseed-promptpay.${ext}`, { type: blob.type || "image/jpeg" });
      })
      .catch(() => {});
  }, [src]);

  const save = async () => {
    trackElemental({ step: "qr_saved" });
    const file = qrFile.current;
    if (file && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return; // closed the share sheet
      }
    }
    const a = document.createElement("a");
    a.href = src;
    a.download = file?.name ?? "passionseed-promptpay.jpg";
    a.click();
  };

  return (
    <button
      type="button"
      onClick={save}
      className={`${styles.choice} flex w-full items-center justify-center gap-3 rounded-full px-6 py-3 text-left`}
      style={{ backgroundColor: EL.ink, color: EL.cream }}
    >
      <Download className="h-5 w-5 shrink-0" />
      <span>
        <span className="block text-base font-semibold">บันทึก QR ลงรูปภาพ</span>
        <span className="block text-sm" style={{ color: EL.creamSoft }}>แล้วเปิดสแกนจากรูปในแอปธนาคาร</span>
      </span>
    </button>
  );
}

type Props = {
  token: string;
  amountBaht: number;
  /** A QR with the amount in it (data URL), or null to show the printed QR. */
  qrSrc: string | null;
  /** Dev only: pretend the slip passed. */
  demo?: boolean;
  /** A parent paying from the student's link: the line about the student's email is left out. */
  forParent?: boolean;
};

export function PayWithSlip({ token, amountBaht, qrSrc, demo, forParent }: Props) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [passed, setPassed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const amount = `฿${amountBaht.toLocaleString("en-US")}`;
  const filled = qrSrc !== null;

  const upload = useCallback(
    async (picked: File | undefined) => {
      if (!picked || busy) return;
      trackElemental({ step: "slip" });
      setBusy(true);
      setError(null);
      try {
        const file = await prepareSlip(picked);
        if (!file) {
          setError("เปิดรูปนี้ไม่ได้ ใช้รูปสลิปแบบ JPG หรือ PNG จากแอปธนาคาร");
          return;
        }
        let data: Partial<Result> & { error?: string };
        let ok: boolean;
        if (demo) {
          await new Promise((r) => setTimeout(r, 1400));
          ok = true;
          data = { result: "paid" };
        } else {
          const form = new FormData();
          form.append("slip", file);
          const res = await fetch(`/api/hackathon/elemental/${token}/slip`, { method: "POST", body: form });
          ok = res.ok;
          data = (await res.json().catch(() => ({}))) as Partial<Result> & { error?: string };
        }
        if (!ok || !data.result) {
          setError("อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง");
          return;
        }
        const r = data as Result;
        trackElemental({ step: "slip_result", detail: r.result === "rejected" ? `rejected:${r.reason}` : r.result }, { once: false });
        const text = message(r, amount);
        if (text) {
          setError(text);
          return;
        }
        setPassed(true);
        // Let the tick land before the page turns into the seat.
        window.setTimeout(() => (demo ? router.push("/hackathon/join/demo?state=paid") : router.refresh()), 900);
      } catch {
        setError("เชื่อมต่อไม่ได้ เช็กอินเทอร์เน็ตแล้วลองอีกครั้ง");
      } finally {
        setBusy(false);
        if (input.current) input.current.value = "";
      }
    },
    [amount, busy, demo, router, token],
  );

  // Paste a slip straight from the clipboard (Cmd+V on a laptop).
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
      if (file) void upload(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [upload]);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void upload(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="space-y-4">
      {/* 1. Pay */}
      {/* On a laptop (lg) the amount and the QR sit side by side, so the slip step stays in view. */}
      <section className="rounded-3xl bg-white p-5 shadow-[0_1px_0_rgba(29,33,31,0.06)] sm:p-7 lg:grid lg:grid-cols-[minmax(0,1fr)_240px] lg:items-center lg:gap-6">
        <div>
          <p className="text-sm font-medium" style={{ color: EL.flame }}>1 · โอน</p>
          <p className="mt-1 text-6xl tabular-nums" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1 }}>
            {amount}
          </p>
          <p className="mt-2 text-sm" style={{ color: EL.inkSoft }}>
            {filled ? "สแกนแล้วยอดขึ้นเอง" : "สแกนแล้วใส่ยอดนี้ให้ตรงทุกบาท"}
          </p>
          {/* On a phone the QR is on the same screen as the bank app, so saving it comes first. */}
          <div className="mt-5 sm:hidden">
            <SaveQrButton src={qrSrc ?? SHIFT_PAYMENT.qrSrc} />
          </div>
        </div>
        <div>
          <div className="mx-auto mt-5 w-full max-w-[180px] sm:max-w-[260px] lg:mt-0">
            {filled ? (
              // eslint-disable-next-line @next/next/no-img-element -- a generated data URL, nothing to optimise
              <img src={qrSrc} alt={`QR พร้อมเพย์ PassionSeed ยอด ${amount}`} width={720} height={720} className="h-auto w-full" />
            ) : (
              <Image src={SHIFT_PAYMENT.qrCardSrc} alt="QR พร้อมเพย์ PassionSeed สำหรับโอนค่าสมัคร" width={800} height={760} className="h-auto w-full" />
            )}
          </div>
          <p className="mt-2 text-center text-xs" style={{ color: EL.inkSoft }}>บริษัท แพชชั่นซี้ด · พร้อมเพย์</p>
        </div>
      </section>

      {/* 2. Slip */}
      <section
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`${styles.drop} rounded-3xl border-2 border-dashed p-5 sm:p-7`}
        style={{
          borderColor: passed ? EL.toxicGreen : dragging ? EL.flame : "rgba(29,33,31,0.18)",
          backgroundColor: dragging ? "rgba(236,100,36,0.06)" : "transparent",
        }}
      >
        <p className="text-sm font-medium" style={{ color: EL.flame }}>2 · ส่งสลิป</p>
        <p className="mt-1 text-lg">อัปโหลดรูปสลิปจากแอปธนาคาร ระบบตรวจให้ทันที</p>

        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => upload(e.target.files?.[0])}
        />
        {passed ? (
          <p className={`${styles.pop} mt-5 inline-flex items-center gap-2 text-lg font-semibold`} role="status">
            <CheckCircle2 className="h-6 w-6" style={{ color: EL.toxicGreen }} /> สลิปผ่านแล้ว
          </p>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className={`${styles.choice} mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-4 text-lg font-semibold disabled:opacity-80`}
            style={{ backgroundColor: EL.flame, color: EL.flameWhite }}
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : error ? <RotateCcw className="h-5 w-5" /> : <ImageUp className="h-5 w-5" />}
            {busy ? "กำลังตรวจสลิป" : error ? "เลือกสลิปใหม่" : "เลือกรูปสลิป"}
          </button>
        )}
        <p className="mt-3 hidden text-center text-sm sm:block" style={{ color: EL.inkSoft }}>
          หรือลากรูปมาวาง หรือกด ⌘V
        </p>
        {error && (
          <p role="alert" className="mt-4 rounded-xl p-4 text-sm leading-relaxed" style={{ backgroundColor: "rgba(184,48,26,0.08)", color: EL.ember }}>
            {error}
          </p>
        )}
        {/* Credit owed to RDCW, who sponsor the slip checks (RDCW email, 2026-11-23). */}
        <p className="mt-5 flex items-center justify-center gap-2 text-xs" style={{ color: EL.inkSoft }}>
          <Image src="/hackathon/sponsors/rdcw.png" alt="" width={20} height={20} className="h-5 w-5 rounded" />
          ตรวจสลิปโดย RDCW Slip Verify
        </p>
      </section>

      <p className="px-1 text-xs leading-relaxed" style={{ color: EL.inkSoft }}>
        {!forParent && "เก็บลิงก์หน้านี้ไว้ กลับมาอัปโหลดสลิปทีหลังได้ เราส่งลิงก์ไปที่อีเมลแล้ว · "}ชำระแล้วไม่มีการคืนเงิน · มีปัญหาทักไลน์{" "}
        <a href={SHIFT_PAYMENT.lineUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          {SHIFT_PAYMENT.lineId}
        </a>
      </p>
    </div>
  );
}
