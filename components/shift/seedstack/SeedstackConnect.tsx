"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Check, Copy, Loader2 } from "lucide-react";

import { shiftJoinButtonClass } from "@/components/shift/join/ShiftJoinActions";
import { INK } from "@/components/shift/poster/riso";
import {
  approveDeviceLink,
  giveStudentConsent,
  newParentLink,
  withdrawConsent,
} from "@/app/shift/seedstack/actions";
import type { SeedstackConsentState } from "@/lib/seedstack/consent";

const paper = (alpha: string) => `${INK.paper}${alpha}`;
const primaryStyle = { backgroundColor: INK.yellow, color: INK.black };
const quietStyle = { backgroundColor: paper("14"), color: INK.paper, boxShadow: `inset 0 0 0 1px ${paper("33")}` };

type Action = () => Promise<{ ok: true; value: string | null } | { ok: false; error: string }>;

/** Runs a server action, keeps its string result, and surfaces errors. */
function useAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState<string | null>(null);

  function run(action: Action) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) setValue(result.value);
      else setError(result.error);
    });
  }
  return { pending, error, value, run };
}

function Button({
  onClick,
  pending,
  disabled,
  primary,
  children,
}: {
  onClick: () => void;
  pending?: boolean;
  disabled?: boolean;
  primary?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending || disabled}
      className={shiftJoinButtonClass}
      style={primary ? primaryStyle : quietStyle}
    >
      {pending && <Loader2 className="h-5 w-5 animate-spin" />}
      {children}
    </button>
  );
}

function CopyBox({ label, value }: { label: string; value: string }) {
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

function ErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="text-sm" style={{ color: INK.orange }} role="alert">
      {error}
    </p>
  );
}

function Text({ children }: { children: ReactNode }) {
  return (
    <p className="leading-relaxed" style={{ color: paper("cc") }}>
      {children}
    </p>
  );
}

/** Birth date decides whether a parent must agree too (under 20, PDPA). */
function StudentConsent({ onParentLink }: { onParentLink: (link: string) => void }) {
  const [agreed, setAgreed] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const action = useAction();

  function agree() {
    action.run(async () => {
      const result = await giveStudentConsent(birthDate);
      if (result.ok && result.value) onParentLink(result.value);
      return result;
    });
  }

  return (
    <>
      <label className="block space-y-2 text-sm" style={{ color: paper("cc") }}>
        <span>วันเกิด (ใช้ดูว่าต้องให้ผู้ปกครองยินยอมด้วยไหม)</span>
        <input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="w-full rounded-xl bg-transparent p-3 text-base outline-none [color-scheme:dark]"
          style={{ color: INK.paper, boxShadow: `inset 0 0 0 1px ${paper("33")}` }}
        />
      </label>
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed" style={{ color: paper("cc") }}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[#ffe800]"
        />
        อ่านแล้ว และยินยอมให้ SeedStack ส่งข้อมูลตามด้านบนให้ทีม mentor
      </label>
      <Button primary pending={action.pending} disabled={!agreed || !birthDate} onClick={agree}>
        ยินยอม แล้วเชื่อมเครื่อง
      </Button>
      <ErrorText error={action.error} />
    </>
  );
}

/** Under 20: the student forwards a private link; the parent answers without an account. */
function ParentStep({ link, declined }: { link: string | null; declined: boolean }) {
  const action = useAction();
  const shown = action.value ?? link;

  return (
    <div className="space-y-4 rounded-xl p-4" style={{ boxShadow: `inset 0 0 0 1px ${paper("33")}` }}>
      <Text>
        {declined
          ? "ผู้ปกครองยังไม่ยินยอม SeedStack ยังใช้ได้ปกติ แค่ข้อมูลจะอยู่ในเครื่องเราอย่างเดียว ถ้าคุยกันแล้วอยากลองใหม่ สร้างลิงก์ใหม่ส่งไปได้"
          : "เรายังไม่ถึง 20 ปี ผู้ปกครองต้องยินยอมด้วย ส่งลิงก์นี้ให้ทาง LINE อ่านแล้วกดตอบได้เลย ไม่ต้องสมัครอะไร ระหว่างรอ ใช้ SeedStack ได้ตามปกติ ข้อมูลจะรอในเครื่องเราก่อน"}
      </Text>
      {shown ? (
        <CopyBox label="ลิงก์ส่วนตัวสำหรับผู้ปกครอง (อย่าโพสต์ในกลุ่ม)" value={shown} />
      ) : (
        <Button primary pending={action.pending} onClick={() => action.run(newParentLink)}>
          {declined ? "สร้างลิงก์ใหม่ให้ผู้ปกครอง" : "สร้างลิงก์ให้ผู้ปกครอง"}
        </Button>
      )}
      <ErrorText error={action.error} />
    </div>
  );
}

/**
 * The student types the code from their own OpenCode screen. Never prefilled
 * from a URL, so a link someone else sends cannot be approved in one click.
 */
function LinkStep() {
  const [code, setCode] = useState("");
  const action = useAction();

  if (action.value) {
    return <Text>เชื่อมแล้ว กลับไปที่ OpenCode ได้เลย มันจะรู้เองในไม่กี่วินาที</Text>;
  }
  return (
    <>
      <Text>
        ใน OpenCode พิมพ์ <code>/seedstack-connect</code> แล้วพิมพ์รหัส 8 ตัวที่ขึ้นบนจอเราเองลงตรงนี้
      </Text>
      <p className="text-sm font-semibold" style={{ color: INK.orange }}>
        ใส่เฉพาะรหัสจาก OpenCode ในเครื่องเราเอง ถ้ามีใครส่งรหัสหรือลิงก์มาให้กด อย่ากด
      </p>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="ABCD-2345"
        autoComplete="off"
        maxLength={9}
        className="w-full rounded-xl bg-transparent p-4 text-center font-kodchasan text-3xl font-bold tracking-widest outline-none"
        style={{ color: INK.yellow, boxShadow: `inset 0 0 0 1px ${paper("33")}` }}
      />
      <Button primary pending={action.pending} disabled={code.trim().length < 8} onClick={() => action.run(() => approveDeviceLink(code))}>
        เชื่อมเครื่องนี้
      </Button>
      <ErrorText error={action.error} />
    </>
  );
}

function WithdrawButton() {
  const [confirming, setConfirming] = useState(false);
  const action = useAction();

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-sm underline" style={{ color: paper("80") }}>
        ถอนความยินยอมและลบข้อมูล
      </button>
    );
  }
  return (
    <div className="space-y-3 rounded-xl p-4" style={{ boxShadow: `inset 0 0 0 1px ${INK.orange}` }}>
      <Text>ระบบจะหยุดเก็บทันที ลบข้อมูลที่เก็บไว้ทั้งหมด และรหัสเชื่อมต่อทุกอันจะใช้ไม่ได้ ยืนยันไหม?</Text>
      <Button pending={action.pending} onClick={() => action.run(withdrawConsent)}>
        ยืนยัน ถอนและลบ
      </Button>
      <button type="button" onClick={() => setConfirming(false)} className="text-sm underline" style={{ color: paper("80") }}>
        ยกเลิก
      </button>
      <ErrorText error={action.error} />
    </div>
  );
}

export function SeedstackConnect({ state }: { state: SeedstackConsentState }) {
  // The raw parent link exists only in the consent response, so hold it here
  // across the re-render that moves the page from "none" to "awaiting_parent".
  const [parentLink, setParentLink] = useState<string | null>(null);

  switch (state) {
    case "none":
    case "withdrawn":
      return <StudentConsent onParentLink={setParentLink} />;
    case "awaiting_parent":
    case "parent_declined":
      return (
        <>
          <LinkStep />
          <ParentStep link={parentLink} declined={state === "parent_declined"} />
          <WithdrawButton />
        </>
      );
    case "active":
      return (
        <>
          <LinkStep />
          <WithdrawButton />
        </>
      );
  }
}
