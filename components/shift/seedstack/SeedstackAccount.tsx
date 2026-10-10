import { INK } from "@/components/shift/poster/riso";
import { SeedstackDiscordButton } from "@/components/shift/seedstack/SeedstackDiscordButton";

import type { SeedstackAccount as Account } from "./seedstackAccountInfo";

const paper = (alpha: string) => `${INK.paper}${alpha}`;

function SignedInAs({ account }: { account: Account }) {
  if (!account.label) return null;
  return (
    <p className="text-sm" style={{ color: paper("99") }}>
      {account.isDiscord ? "ตอนนี้ใช้ Discord " : "ตอนนี้ใช้บัญชี "}
      <span className="font-semibold" style={{ color: INK.paper }}>
        {account.label}
      </span>
    </p>
  );
}

function SwitchNote({ isDiscord, next }: { isDiscord: boolean; next: string }) {
  return (
    <div className="space-y-3 rounded-2xl p-4" style={{ boxShadow: `inset 0 0 0 1px ${paper("33")}` }}>
      <p className="text-sm leading-relaxed" style={{ color: paper("cc") }}>
        บัญชีนี้ยังไม่มีที่นั่ง SHIFT ถ้าอยู่ SHIFT เปลี่ยนเป็น Discord ที่ใช้เข้าเซิร์ฟ พี่ mentor จะได้รู้ว่าเป็นเรา
        ถ้าไม่ได้อยู่ SHIFT ใช้บัญชีนี้ต่อได้เลย
      </p>
      <SeedstackDiscordButton next={next} label="เปลี่ยนเป็น Discord ที่ใช้ใน SHIFT" />
      {isDiscord && (
        <p className="text-xs" style={{ color: paper("80") }}>
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
