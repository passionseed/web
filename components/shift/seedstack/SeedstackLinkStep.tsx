"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { FLOW_TEXT, flowFieldClass, flowPanelClass } from "@/components/shift/join/shiftFlowInk";
import { INK } from "@/components/shift/poster/riso";
import { CopyBox } from "@/components/shift/seedstack/SeedstackCopyBox";
import { SeedstackInstallHelp } from "@/components/shift/seedstack/SeedstackInstallHelp";
import { Button, ErrorText, Text, useAction } from "@/components/shift/seedstack/seedstackFlowUi";
import { approveDeviceLink } from "@/app/shift/seedstack/actions";
import { formatUserCodeInput, normalizeUserCode } from "@/lib/seedstack/userCode";

const REFRESH_EVERY_MS = 4000;
const REFRESH_FOR_MS = 2 * 60 * 1000;

/**
 * Approving only marks the code; the token is made when OpenCode next asks.
 * Re-render the page for a while so it shows the new computer once that
 * happens, then stop. Stops early once the device count goes up.
 */
function useRefreshUntilLinked(active: boolean, linked: boolean) {
  const router = useRouter();
  useEffect(() => {
    if (!active || linked) return;
    const started = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - started > REFRESH_FOR_MS) clearInterval(timer);
      else router.refresh();
    }, REFRESH_EVERY_MS);
    return () => clearInterval(timer);
  }, [active, linked, router]);
}

/** Numbered step inside the link card: an ink disc, a bold line, then the work. */
function StepItem({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="space-y-3">
      <p className="flex items-center gap-3 font-kodchasan text-[17px] font-bold" style={{ color: FLOW_TEXT.strong }}>
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm"
          style={{ backgroundColor: INK.yellow, color: INK.black, boxShadow: `2px 2px 0 0 ${INK.pink}` }}
          aria-hidden="true"
        >
          {n}
        </span>
        <span>
          <span className="sr-only">ขั้นที่ {n}: </span>
          {title}
        </span>
      </p>
      <div className="space-y-3 sm:pl-10">{children}</div>
    </li>
  );
}

function Approved({ linked }: { linked: boolean }) {
  return (
    <div className={`${flowPanelClass} space-y-2 p-4`} role="status">
      {linked ? (
        <Text>✅ OpenCode รับแล้ว เครื่องนี้เชื่อมติดเรียบร้อย</Text>
      ) : (
        <>
          <Text>เชื่อมแล้ว 🎉 กลับไปที่ OpenCode ได้เลย</Text>
          <p className="text-[15px] leading-relaxed" style={{ color: FLOW_TEXT.muted }}>
            ถ้ามันยังรออยู่ พิมพ์บอกมันว่า &quot;กดแล้ว&quot; หน้านี้จะเปลี่ยนเองเมื่อ OpenCode รับ
          </p>
        </>
      )}
    </div>
  );
}

/**
 * The student types the code from their own OpenCode screen. Never prefilled
 * from a URL, so a link someone else sends cannot be approved in one click.
 * `devices` is how many computers the page knows are linked right now.
 */
export function LinkStep({ devices }: { devices: number }) {
  const [code, setCode] = useState("");
  const action = useAction();
  const ready = normalizeUserCode(code) !== null;
  // How many computers were linked when the student pressed, so a new one shows as "linked".
  const [devicesBefore, setDevicesBefore] = useState(devices);
  const approved = action.value !== null;
  const linked = approved && devices > devicesBefore;

  useRefreshUntilLinked(approved, linked);

  if (approved) return <Approved linked={linked} />;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!ready || action.pending) return;
    setDevicesBefore(devices);
    action.run(() => approveDeviceLink(code));
  }

  return (
    <ol className={`${flowPanelClass} space-y-7 p-4 sm:p-5`}>
      <StepItem n={1} title="เปิด OpenCode แล้วพิมพ์">
        <CopyBox value="/seedstack-connect" />
        <SeedstackInstallHelp />
      </StepItem>
      <StepItem n={2} title="ใส่รหัส 8 ตัวที่ขึ้นในจอ">
        <form onSubmit={submit} className="space-y-3">
          <input
            value={code}
            onChange={(e) => setCode(formatUserCodeInput(e.target.value))}
            placeholder="ABCD-2345"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="go"
            aria-label="รหัส 8 ตัวจาก OpenCode"
            aria-describedby="seedstack-code-safety"
            className={`${flowFieldClass} p-4 text-center font-kodchasan text-3xl font-bold tracking-widest`}
            style={{ color: FLOW_TEXT.link }}
          />
          <p id="seedstack-code-safety" className="text-sm font-semibold leading-relaxed" style={{ color: FLOW_TEXT.warn }}>
            ใช้รหัสจากจอเครื่องเราเองเท่านั้น ใครส่งรหัสหรือลิงก์มาให้กด อย่ากด
          </p>
          <Button primary type="submit" pending={action.pending} disabled={!ready}>
            เชื่อมเครื่องนี้
          </Button>
          <ErrorText error={action.error} />
        </form>
      </StepItem>
    </ol>
  );
}
