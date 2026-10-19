import { FLOW_TEXT, flowPanelClass } from "@/components/shift/join/shiftFlowInk";
import { SeedstackDiscordButton } from "@/components/shift/seedstack/SeedstackDiscordButton";

import type { SeedstackAccount as Account } from "./seedstackAccountInfo";

function SignedInAs({ account }: { account: Account }) {
  if (!account.label) return null;
  return (
    <p className="text-sm" style={{ color: FLOW_TEXT.muted }}>
      {account.isDiscord ? "ตอนนี้ใช้ Discord " : "ตอนนี้ใช้บัญชี "}
      <span className="font-semibold" style={{ color: FLOW_TEXT.strong }}>
        {account.label}
      </span>
    </p>
  );
}

function SwitchNote({ isDiscord, next }: { isDiscord: boolean; next: string }) {
  return (
    <div className={`${flowPanelClass} space-y-4 p-4`}>
      <p className="text-[15px] leading-relaxed" style={{ color: FLOW_TEXT.body }}>
        บัญชีนี้ยังไม่มีที่นั่ง SHIFT ถ้าอยู่ SHIFT เปลี่ยนเป็น Discord ที่ใช้เข้าเซิร์ฟ พี่ mentor จะได้รู้ว่าเป็นเรา
        ถ้าไม่ได้อยู่ SHIFT ใช้บัญชีนี้ต่อได้เลย
      </p>
      <SeedstackDiscordButton next={next} label="เปลี่ยนเป็น Discord ที่ใช้ใน SHIFT" />
      {isDiscord && (
        <p className="text-sm leading-relaxed" style={{ color: FLOW_TEXT.muted }}>
          ถ้าหน้า Discord ขึ้นบัญชีเดิม กด Not you? เพื่อสลับบัญชีก่อน
        </p>
      )}
    </div>
  );
}

/** Shows which account SeedStack will link, and offers a switch when it has no SHIFT seat. */
export function SeedstackAccount({ account, next }: { account: Account; next: string }) {
  return (
    <div className="space-y-4">
      <SignedInAs account={account} />
      {account.needsSwitch && <SwitchNote isDiscord={account.isDiscord} next={next} />}
    </div>
  );
}
