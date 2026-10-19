"use client";

import { useState } from "react";

import { FLOW_TEXT, flowFieldClass, flowPanelClass } from "@/components/shift/join/shiftFlowInk";
import { CopyBox } from "@/components/shift/seedstack/SeedstackCopyBox";
import { LinkStep } from "@/components/shift/seedstack/SeedstackLinkStep";
import { Button, ErrorText, Text, useAction } from "@/components/shift/seedstack/seedstackFlowUi";
import { giveStudentConsent, newParentLink } from "@/app/shift/seedstack/actions";
import type { SeedstackConsentState } from "@/lib/seedstack/consent";

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
      <label className="block space-y-2 text-[15px]" style={{ color: FLOW_TEXT.body }}>
        <span>วันเกิด (ใช้ดูว่าต้องให้ผู้ปกครองยินยอมด้วยไหม)</span>
        <input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className={`${flowFieldClass} min-h-12 px-4 py-3 text-base [color-scheme:dark]`}
        />
      </label>
      <label
        className={`${flowPanelClass} flex min-h-12 cursor-pointer items-start gap-3 p-4 text-[15px] leading-relaxed`}
        style={{ color: FLOW_TEXT.body }}
      >
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[#ffe800]"
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
export function ParentStep({ link, declined }: { link: string | null; declined: boolean }) {
  const action = useAction();
  const shown = action.value ?? link;

  return (
    <div className={`${flowPanelClass} space-y-4 p-4`}>
      <Text>
        {declined
          ? "ผู้ปกครองยังไม่ยินยอม SeedStack ยังใช้ได้ปกติ แค่ข้อมูลจะอยู่ในเครื่องเราอย่างเดียว ถ้าคุยกันแล้วอยากลองใหม่ สร้างลิงก์ใหม่ส่งไปได้"
          : "เรายังไม่ถึง 20 ปี ผู้ปกครองต้องยินยอมด้วย ส่งลิงก์นี้ให้ทาง LINE อ่านแล้วกดตอบได้เลย ไม่ต้องสมัครอะไร ระหว่างรอ ใช้ SeedStack ได้ตามปกติ ข้อมูลจะรอในเครื่องเราก่อน"}
      </Text>
      {shown ? (
        <CopyBox label="ลิงก์ส่วนตัวสำหรับผู้ปกครอง (อย่าโพสต์ในกลุ่ม)" value={shown} />
      ) : (
        <>
          {!declined && (
            <p className="text-[15px] leading-relaxed" style={{ color: FLOW_TEXT.muted }}>
              ส่งลิงก์ไปแล้ว? รอได้เลย ถ้ากดสร้างใหม่ ลิงก์เดิมจะใช้ไม่ได้
            </p>
          )}
          <Button primary={declined} pending={action.pending} onClick={() => action.run(newParentLink)}>
            {declined ? "สร้างลิงก์ใหม่ให้ผู้ปกครอง" : "สร้างลิงก์ให้ผู้ปกครอง"}
          </Button>
        </>
      )}
      <ErrorText error={action.error} />
    </div>
  );
}

/**
 * Before a computer is linked: agree, then link. Once one is linked the page
 * shows the dashboard instead. Withdrawing lives in the page's bottom
 * "ข้อมูลของเรา" section, away from the main job.
 */
export function SeedstackConnect({ state, devices }: { state: SeedstackConsentState; devices: number }) {
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
          <LinkStep devices={devices} />
          <ParentStep link={parentLink} declined={state === "parent_declined"} />
        </>
      );
    case "active":
      return <LinkStep devices={devices} />;
  }
}
