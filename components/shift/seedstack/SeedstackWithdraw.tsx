"use client";

import { useState } from "react";

import { FLOW_TEXT, flowPanelWarnClass } from "@/components/shift/join/shiftFlowInk";
import { Button, ErrorText, Text, useAction } from "@/components/shift/seedstack/seedstackFlowUi";
import { withdrawConsent } from "@/app/shift/seedstack/actions";

/** Quiet text link first; the destructive button only after a confirm. */
export function WithdrawButton() {
  const [confirming, setConfirming] = useState(false);
  const action = useAction();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="min-h-12 text-sm font-semibold underline underline-offset-4"
        style={{ color: FLOW_TEXT.muted }}
      >
        ถอนความยินยอมและลบข้อมูล
      </button>
    );
  }
  return (
    <div className={`${flowPanelWarnClass} space-y-3 p-4`}>
      <Text>ระบบจะหยุดเก็บทันที ลบข้อมูลที่เก็บไว้ทั้งหมด และทุกเครื่องที่เชื่อมไว้จะส่งข้อมูลไม่ได้อีก ยืนยันไหม?</Text>
      <Button pending={action.pending} onClick={() => action.run(withdrawConsent)}>
        ยืนยัน ถอนและลบ
      </Button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="min-h-12 w-full text-sm font-semibold underline underline-offset-4"
        style={{ color: FLOW_TEXT.body }}
      >
        ยกเลิก
      </button>
      <ErrorText error={action.error} />
    </div>
  );
}
