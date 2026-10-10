"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { shiftJoinButtonClass } from "@/components/shift/join/ShiftJoinActions";
import { INK } from "@/components/shift/poster/riso";
import { parentWithdraw, submitParentDecision } from "@/app/shift/seedstack/actions";
import type { ParentDecision } from "@/lib/seedstack/server";

const paper = (alpha: string) => `${INK.paper}${alpha}`;
const inputClass =
  "w-full border-0 border-b bg-transparent px-0 py-3 text-base outline-none placeholder:text-[rgba(242,234,217,0.3)] focus:ring-0";
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
      <div className="space-y-4">
        <p className="leading-relaxed" style={{ color: paper("cc") }}>
          {DONE_TEXT[decision]}
        </p>
        {decision === "agreed" && (
          <button type="button" onClick={withdraw} disabled={pending} className="text-sm underline" style={{ color: paper("80") }}>
            ถอนความยินยอมและลบข้อมูล
          </button>
        )}
        {decision === "declined" && (
          <button type="button" onClick={() => setDecision(null)} className="text-sm underline" style={{ color: paper("80") }}>
            เปลี่ยนใจ ยินยอม
          </button>
        )}
        {error && <p className="text-sm" style={{ color: INK.orange }}>{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="ชื่อ-นามสกุลผู้ปกครอง"
        className={inputClass}
        style={{ borderColor: paper("33"), color: INK.paper }}
      />
      <div className="flex flex-wrap gap-2">
        {RELATIONSHIPS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRelationship(r)}
            className="rounded-full px-4 py-2 text-sm"
            style={relationship === r ? { backgroundColor: INK.yellow, color: INK.black } : { boxShadow: `inset 0 0 0 1px ${paper("33")}` }}
          >
            {r}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => decide(true)}
        disabled={pending}
        className={shiftJoinButtonClass}
        style={{ backgroundColor: INK.yellow, color: INK.black }}
      >
        {pending && <Loader2 className="h-5 w-5 animate-spin" />}
        ยินยอม
      </button>
      <button
        type="button"
        onClick={() => decide(false)}
        disabled={pending}
        className={shiftJoinButtonClass}
        style={{ backgroundColor: paper("14"), color: INK.paper }}
      >
        ไม่ยินยอม
      </button>
      {error && <p className="text-sm" style={{ color: INK.orange }} role="alert">{error}</p>}
    </div>
  );
}
