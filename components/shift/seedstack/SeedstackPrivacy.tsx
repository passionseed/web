import { FLOW_TEXT } from "@/components/shift/join/shiftFlowInk";
import { SeedstackNotice } from "@/components/shift/seedstack/SeedstackNotice";
import { WithdrawButton } from "@/components/shift/seedstack/SeedstackWithdraw";

/** Bottom of the page after agreeing: what is collected, and the way out. */
export function SeedstackPrivacy() {
  return (
    <section className="space-y-3" aria-labelledby="seedstack-privacy">
      <h2 id="seedstack-privacy" className="font-kodchasan text-lg font-bold" style={{ color: FLOW_TEXT.strong }}>
        ข้อมูลของเรา
      </h2>
      <SeedstackNotice variant="collapsed" />
      <p className="text-[15px] leading-relaxed" style={{ color: FLOW_TEXT.body }}>
        เปลี่ยนใจเมื่อไหร่ก็ได้ ไม่ต้องบอกเหตุผล SHIFT ยังทำได้ครบกับพี่ใน Discord
      </p>
      <WithdrawButton />
    </section>
  );
}
