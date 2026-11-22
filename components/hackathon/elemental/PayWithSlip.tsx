"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Download, Loader2, Upload } from "lucide-react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { SHIFT_PAYMENT } from "@/lib/content/shift-cohort";
import { prepareSlip } from "@/lib/hackathon/elemental/slip-image";

/**
 * Pay for a sign-up: transfer the exact amount by PromptPay, then upload
 * the slip. The server checks it with SlipOK and answers right away.
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

export function PayWithSlip({ token, amountBaht }: { token: string; amountBaht: number }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amount = `฿${amountBaht.toLocaleString("en-US")}`;

  const upload = async (picked: File | undefined) => {
    if (!picked) return;
    setBusy(true);
    setError(null);
    try {
      const file = await prepareSlip(picked);
      if (!file) {
        setError("เปิดรูปนี้ไม่ได้ ใช้รูปสลิปแบบ JPG หรือ PNG จากแอปธนาคาร");
        return;
      }
      const form = new FormData();
      form.append("slip", file);
      const res = await fetch(`/api/hackathon/elemental/${token}/slip`, { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as Partial<Result> & { error?: string };
      if (!res.ok || !data.result) {
        setError("อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง");
        return;
      }
      const text = message(data as Result, amount);
      if (text) setError(text);
      else router.refresh();
    } catch {
      setError("เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="grid gap-8 sm:grid-cols-[240px_1fr] sm:items-start">
      <div className="mx-auto w-full max-w-[240px]">
        <div className="overflow-hidden rounded-2xl bg-white p-2 shadow-sm">
          <Image
            src={SHIFT_PAYMENT.qrCardSrc}
            alt="QR พร้อมเพย์ PassionSeed สำหรับโอนค่าสมัคร"
            width={800}
            height={760}
            className="h-auto w-full"
          />
        </div>
        <a
          href={SHIFT_PAYMENT.qrSrc}
          download
          className="mt-3 inline-flex w-full items-center justify-center gap-2 text-sm underline underline-offset-4"
          style={{ color: EL.inkSoft }}
        >
          <Download className="h-4 w-4" /> บันทึก QR ไปสแกนในแอปธนาคาร
        </a>
      </div>

      <div>
        <ol className="space-y-4">
          <li>
            <p className="text-xs" style={{ fontFamily: EL_FONT.mono, color: EL.flame }}>01</p>
            <p>สแกน QR แล้วโอนยอดนี้ <strong>ให้ตรงทุกบาท</strong></p>
            <p className="mt-1 text-5xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>{amount}</p>
          </li>
          <li>
            <p className="text-xs" style={{ fontFamily: EL_FONT.mono, color: EL.flame }}>02</p>
            <p>อัปโหลดรูปสลิปจากแอปธนาคาร ระบบจะตรวจให้ทันที</p>
          </li>
        </ol>

        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => upload(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold disabled:opacity-60 sm:w-auto"
          style={{ backgroundColor: EL.flame, color: EL.flameWhite }}
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          {busy ? "กำลังตรวจสลิป" : "อัปโหลดสลิป"}
        </button>
        {error && (
          <p role="alert" className="mt-4 text-sm leading-relaxed" style={{ color: EL.ember }}>
            {error}
          </p>
        )}
        <p className="mt-6 text-xs" style={{ color: EL.inkSoft }}>
          เก็บลิงก์หน้านี้ไว้ กลับมาอัปโหลดสลิปทีหลังได้ · ชำระแล้วไม่มีการคืนเงิน
        </p>
      </div>
    </div>
  );
}

export function PaidBadge() {
  return <CheckCircle2 className="h-10 w-10" style={{ color: EL.toxicGreen }} aria-hidden="true" />;
}
