import { DoorOpen, LogIn, UserPlus } from "lucide-react";

import { FLOW_TEXT } from "./shiftFlowInk";

/** The same brief instructions wherever students start Discord sign-in. */
export function DiscordSteps() {
  return (
    <div className="space-y-4 text-left text-sm leading-relaxed" style={{ color: FLOW_TEXT.body }}>
      <ol className="space-y-4" aria-label="ขั้นตอนในหน้า Discord">
        <li className="flex items-start gap-3">
          <LogIn className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" style={{ color: FLOW_TEXT.sky }} />
          <span><strong className="block">1. เข้าสู่ระบบ Discord</strong><span style={{ color: FLOW_TEXT.muted }}>ใช้บัญชีของตัวเอง</span></span>
        </li>
        <li className="flex items-start gap-3">
          <DoorOpen className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" style={{ color: FLOW_TEXT.sky }} />
          <span><strong className="block">2. กด Authorize / อนุญาต</strong><span style={{ color: FLOW_TEXT.muted }}>เพื่อให้ระบบพาเข้ากลุ่ม SHIFT</span></span>
        </li>
      </ol>
      <details>
        <summary className="min-h-12 cursor-pointer py-3 font-semibold"><UserPlus className="mr-2 inline h-5 w-5 align-middle" aria-hidden="true" />ยังไม่มีบัญชี Discord?</summary>
        <ol className="list-decimal space-y-2 pl-5 pb-3">
          <li>กดปุ่มเข้าห้องเรียนด้านบน</li>
          <li>เลือก Register / สมัครสมาชิก ในหน้า Discord แล้วสร้างบัญชี</li>
          <li>สมัครเสร็จ กลับมาที่ลิงก์นี้ แล้วกดเข้าห้องเรียนอีกครั้ง</li>
        </ol>
      </details>
    </div>
  );
}
