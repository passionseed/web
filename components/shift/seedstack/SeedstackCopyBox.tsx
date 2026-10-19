"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { FLOW_TEXT, flowPanelClass } from "@/components/shift/join/shiftFlowInk";
import { INK } from "@/components/shift/poster/riso";

export function CopyBox({ label, value }: { label?: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
  }
  return (
    <div className="space-y-2">
      {label && (
        <p className="text-sm leading-relaxed" style={{ color: FLOW_TEXT.muted }}>
          {label}
        </p>
      )}
      <div className={`${flowPanelClass} flex items-center gap-2 py-1.5 pl-4 pr-1.5`}>
        <code className="min-w-0 flex-1 break-all py-2 text-sm leading-relaxed" style={{ color: FLOW_TEXT.strong }}>
          {value}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "คัดลอกแล้ว" : "คัดลอก"}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-[rgba(242,234,217,0.1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffe800]"
          style={{ color: copied ? INK.yellow : FLOW_TEXT.strong }}
        >
          {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
