"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { ChevronRight } from "lucide-react";

import { FLOW_TEXT } from "@/components/shift/join/shiftFlowInk";
import { INK } from "@/components/shift/poster/riso";
import { CopyBox } from "@/components/shift/seedstack/SeedstackCopyBox";
import { SEEDSTACK_GUIDE } from "@/lib/content/seedstack-guide";

type Os = (typeof SEEDSTACK_GUIDE.install.lines)[number]["os"];

const OS_LABEL: Record<Os, string> = { mac: "Mac", windows: "Windows" };

const noSubscribe = () => () => {};
const detectOs = (): Os => (/Windows/i.test(navigator.userAgent) ? "windows" : "mac");
/** The server cannot see the device, so it renders Mac; the client corrects it on hydration. */
const serverOs = (): Os => "mac";

function OsToggle({ os, onPick }: { os: Os; onPick: (os: Os) => void }) {
  return (
    <div className="flex gap-2" role="group" aria-label="เครื่องที่ใช้">
      {SEEDSTACK_GUIDE.install.lines.map((line) => {
        const on = line.os === os;
        return (
          <button
            key={line.os}
            type="button"
            onClick={() => onPick(line.os)}
            aria-pressed={on}
            className="min-h-12 rounded-full px-5 text-sm font-semibold"
            style={
              on
                ? { backgroundColor: INK.paper, color: INK.black, boxShadow: `2px 2px 0 0 ${INK.pink}` }
                : { color: FLOW_TEXT.strong, boxShadow: "inset 0 0 0 1.5px rgba(242,234,217,0.5)" }
            }
          >
            {OS_LABEL[line.os]}
          </button>
        );
      })}
    </div>
  );
}

/** Inline install lines for a student who reached the link step without SeedStack. */
export function SeedstackInstallHelp() {
  const detected = useSyncExternalStore(noSubscribe, detectOs, serverOs);
  const [picked, setPicked] = useState<Os | null>(null);
  const os = picked ?? detected;
  const line = SEEDSTACK_GUIDE.install.lines.find((l) => l.os === os) ?? SEEDSTACK_GUIDE.install.lines[0];

  return (
    <details className="group">
      <summary
        className="flex min-h-12 cursor-pointer list-none items-center gap-1.5 text-[15px] font-semibold [&::-webkit-details-marker]:hidden"
        style={{ color: FLOW_TEXT.link }}
      >
        <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" />
        ยังไม่มี SeedStack ในเครื่อง?
      </summary>
      <div className="space-y-3 pb-1 pt-2">
        <OsToggle os={os} onPick={setPicked} />
        <CopyBox label={line.label} value={line.value} />
        <p className="text-sm leading-relaxed" style={{ color: FLOW_TEXT.body }}>
          ติดตั้งเสร็จ เปิด OpenCode ใหม่ แล้วพิมพ์ <code style={{ color: FLOW_TEXT.strong }}>/seedstack-connect</code>
        </p>
        <Link
          href="/shift/seedstack/guide#install"
          className="inline-flex min-h-12 items-center text-sm font-semibold underline underline-offset-4"
          style={{ color: FLOW_TEXT.muted }}
        >
          ดูคู่มือเต็ม
        </Link>
      </div>
    </details>
  );
}
