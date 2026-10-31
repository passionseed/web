"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { FLOW_TEXT, flowButtonClass, flowFieldClass, flowPanelClass } from "@/components/shift/join/shiftFlowInk";
import { INK } from "@/components/shift/poster/riso";
import { submitShiftParentDecision, withdrawShiftParentDecision } from "@/app/shift/parent/actions";
import { PARENT_RELATIONSHIPS } from "@/lib/shift/parentConsent";

const linkButtonClass = "min-h-12 text-sm font-semibold underline underline-offset-4";

export type ShiftParentDecision = "agreed" | "declined" | "withdrawn";

/**
 * The parent's typed full name, relationship and tick are their electronic
 * signature (Electronic Transactions Act s.9). The server stores them with
 * the time, IP and browser.
 */
export function ShiftParentForm({
  token,
  decision: initialDecision,
  nickname,
  fullName,
  cohortName,
}: {
  token: string;
  decision: ShiftParentDecision | null;
  nickname: string;
  fullName: string;
  cohortName: string;
}) {
  const [decision, setDecision] = useState<ShiftParentDecision | null>(initialDecision);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [aiAgreed, setAiAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function decide(agree: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await submitShiftParentDecision({
        token,
        agree,
        parentName: name,
        relationship,
        confirmed,
        aiAgreed,
      });
      if (result.ok) setDecision(agree ? "agreed" : "declined");
      else setError(result.error);
    });
  }

  function withdraw() {
    setError(null);
    startTransition(async () => {
      const result = await withdrawShiftParentDecision(token);
      if (result.ok) setDecision("withdrawn");
      else setError(result.error);
    });
  }

  const errorText = error && (
    <p className="text-sm font-semibold" style={{ color: FLOW_TEXT.warn }} role="alert">
      {error}
    </p>
  );

  if (decision) {
    const done: Record<ShiftParentDecision, string> = {
      agreed: `ขอบคุณค่ะ บันทึกความยินยอมแล้ว ${nickname} ยืนยันที่นั่งได้เลย ถอนความยินยอมได้ทุกเมื่อที่ลิงก์นี้ (ถอนแล้วจะหยุดการติดตามด้วย AI ด้วย)`,
      declined: `บันทึกแล้วค่ะ ${nickname} จะยังไม่ได้รับการยืนยันที่นั่ง ถ้าเปลี่ยนใจ กลับมาที่ลิงก์นี้ได้`,
      withdrawn: "ถอนความยินยอมแล้วค่ะ ทีมงานจะติดต่อกลับเรื่องที่นั่งและการคืนเงิน",
    };
    return (
      <div className={`${flowPanelClass} space-y-3 p-4`} role="status">
        <p className="text-[17px] leading-relaxed" style={{ color: FLOW_TEXT.body }}>
          {done[decision]}
        </p>
        {decision === "agreed" && (
          <button type="button" onClick={withdraw} disabled={pending} className={linkButtonClass} style={{ color: FLOW_TEXT.muted }}>
            ถอนความยินยอม
          </button>
        )}
        {decision === "declined" && (
          <button type="button" onClick={() => setDecision(null)} className={linkButtonClass} style={{ color: FLOW_TEXT.muted }}>
            เปลี่ยนใจ ยินยอม
          </button>
        )}
        {errorText}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="ชื่อ-นามสกุลผู้ปกครอง"
        aria-label="ชื่อ-นามสกุลผู้ปกครอง"
        autoComplete="name"
        className={`${flowFieldClass} min-h-12 px-4 py-3 text-base`}
      />
      <div className="flex flex-wrap gap-2" role="group" aria-label={`ความเกี่ยวข้องกับ ${nickname}`}>
        {PARENT_RELATIONSHIPS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRelationship(r)}
            aria-pressed={relationship === r}
            className="min-h-12 rounded-full px-5 text-[15px] font-semibold"
            style={
              relationship === r
                ? { backgroundColor: INK.paper, color: INK.black, boxShadow: `2px 2px 0 0 ${INK.pink}` }
                : { color: FLOW_TEXT.strong, boxShadow: "inset 0 0 0 1.5px rgba(242,234,217,0.5)" }
            }
          >
            {r}
          </button>
        ))}
      </div>
      <label
        className={`${flowPanelClass} flex min-h-12 cursor-pointer items-start gap-3 p-4 text-[15px] leading-relaxed`}
        style={{ color: FLOW_TEXT.body }}
      >
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[#ffe800]"
        />
        ข้าพเจ้าเป็นผู้ปกครองของ {fullName} อ่านรายละเอียดด้านบนแล้ว ยินยอมให้เข้าร่วม {cohortName}
        และให้ PassionSeed ใช้ข้อมูลตามที่แจ้ง การพิมพ์ชื่อและกดยินยอมนี้ถือเป็นการลงลายมือชื่ออิเล็กทรอนิกส์
      </label>
      <label
        className={`${flowPanelClass} flex min-h-12 cursor-pointer items-start gap-3 p-4 text-[15px] leading-relaxed`}
        style={{ color: FLOW_TEXT.body }}
      >
        <input
          type="checkbox"
          checked={aiAgreed}
          onChange={(e) => setAiAgreed(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[#ffe800]"
        />
        <span>
          (ไม่บังคับ) ยินยอมให้ใช้ AI ติดตามความคืบหน้าของ {nickname} ด้วย SeedStack ตามรายละเอียดด้านบน
          ไม่ติ๊กก็เรียน SHIFT ได้ครบทุกอย่าง
        </span>
      </label>
      <button
        type="button"
        onClick={() => decide(true)}
        disabled={pending || !confirmed}
        aria-busy={pending}
        className={flowButtonClass}
      >
        {pending && <Loader2 className="h-5 w-5 motion-safe:animate-spin" aria-hidden="true" />}
        ยินยอม
      </button>
      <button type="button" onClick={() => decide(false)} disabled={pending} className={flowButtonClass} data-variant="quiet">
        ไม่ยินยอม
      </button>
      {errorText}
    </div>
  );
}
