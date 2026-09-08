"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "พิมพ์ / บันทึกเป็น PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-stone-900/12 bg-white px-4 text-sm font-semibold text-stone-800 shadow-sm transition-colors hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 print:hidden"
    >
      <Printer className="h-4 w-4 text-orange-500" aria-hidden="true" />
      {label}
    </button>
  );
}
