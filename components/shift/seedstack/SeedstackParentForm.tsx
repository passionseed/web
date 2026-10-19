"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { FLOW_TEXT, flowButtonClass, flowFieldClass, flowPanelClass } from "@/components/shift/join/shiftFlowInk";
import { INK } from "@/components/shift/poster/riso";
import { parentWithdraw, submitParentDecision } from "@/app/shift/seedstack/actions";
import type { ParentDecision } from "@/lib/seedstack/server";

const linkButtonClass = "min-h-12 text-sm font-semibold underline underline-offset-4";
const RELATIONSHIPS = ["พ่อ", "แม่", "ผู้ปกครอง"] as const;

type Decision = "agreed" | "declined" | "withdrawn";

const DONE_TEXT: Record<Decision, string> = {
  agreed: "ขอบคุณค่ะ บันทึกความยินยอมแล้ว ถอนได้ทุกเมื่อที่ลิงก์เดิมนี้",
  declined: "บันทึกแล้วค่ะ ระบบจะไม่เก็บข้อมูล ข้อมูลอยู่ในเครื่องของผู้เรียนเท่านั้น และยังเรียน SHIFT ได้ตามปกติ",
  withdrawn: "ถอนความยินยอมแล้วค่ะ ระบบหยุดเก็บและลบข้อมูลที่เก็บไว้ทั้งหมดแล้ว",
};

/** Starts from the parent's own answer, never the overall state: a student turning 20 is not a parent agreeing. */
export function SeedstackParentForm({ token, parentDecision }: { token: string; parentDecision: ParentDecision }) {
  const [decision, setDecision] = useState<Decision | null>(parentDecision);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function decide(agree: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await submitParentDecision({ token, agree, parentName: name, relationship });
      if (result.ok) setDecision(agree ? "agreed" : "declined");
      else setError(result.error);
    });
  }

  function withdraw() {
    setError(null);
    startTransition(async () => {
      const result = await parentWithdraw(token);
      if (result.ok) setDecision("withdrawn");
      else setError(result.error);
    });
  }

  if (decision) {
    return (
      <div className={`${flowPanelClass} space-y-3 p-4`} role="status">
        <p className="text-[17px] leading-relaxed" style={{ color: FLOW_TEXT.body }}>
          {DONE_TEXT[decision]}
        </p>
        {decision === "agreed" && (
          <button type="button" onClick={withdraw} disabled={pending} className={linkButtonClass} style={{ color: FLOW_TEXT.muted }}>
            ถอนความยินยอมและลบข้อมูล
          </button>
        )}
        {decision === "declined" && (
          <button type="button" onClick={() => setDecision(null)} className={linkButtonClass} style={{ color: FLOW_TEXT.muted }}>
            เปลี่ยนใจ ยินยอม
          </button>
        )}
        {error && <p className="text-sm font-semibold" style={{ color: FLOW_TEXT.warn }} role="alert">{error}</p>}
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
        className={`${flowFieldClass} min-h-12 px-4 py-3 text-base`}
      />
      <div className="flex flex-wrap gap-2" role="group" aria-label="ความสัมพันธ์กับผู้เรียน">
        {RELATIONSHIPS.map((r) => (
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
      <button
        type="button"
        onClick={() => decide(true)}
        disabled={pending}
        aria-busy={pending}
        className={flowButtonClass}
      >
        {pending && <Loader2 className="h-5 w-5 motion-safe:animate-spin" aria-hidden="true" />}
        ยินยอม
      </button>
      <button
        type="button"
        onClick={() => decide(false)}
        disabled={pending}
        className={flowButtonClass}
        data-variant="quiet"
      >
        ไม่ยินยอม
      </button>
      {error && <p className="text-sm font-semibold" style={{ color: FLOW_TEXT.warn }} role="alert">{error}</p>}
    </div>
  );
}
