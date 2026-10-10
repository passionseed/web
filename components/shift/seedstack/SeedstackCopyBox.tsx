"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { INK } from "@/components/shift/poster/riso";

const paper = (alpha: string) => `${INK.paper}${alpha}`;

export function CopyBox({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
  }
  return (
    <div className="space-y-2">
      <p className="text-sm" style={{ color: paper("b3") }}>
        {label}
      </p>
      <div className="flex items-center gap-2 rounded-xl p-3" style={{ backgroundColor: paper("0d") }}>
        <code className="min-w-0 flex-1 break-all text-sm">{value}</code>
        <button type="button" onClick={copy} aria-label="คัดลอก" className="shrink-0 p-2">
          {copied ? <Check className="h-5 w-5" style={{ color: INK.yellow }} /> : <Copy className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
