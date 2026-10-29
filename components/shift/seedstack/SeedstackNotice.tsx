import {
  Disclosure,
  PdpaNotice,
  type PdpaNoticeVariant,
} from "@/components/shift/consent/PdpaNotice";
import { SEEDSTACK_NOTICE } from "@/lib/seedstack/consent";

export { Disclosure };
export type SeedstackNoticeVariant = PdpaNoticeVariant;

/** The SeedStack telemetry notice. See PdpaNotice for the three variants. */
export function SeedstackNotice({ variant = "full" }: { variant?: SeedstackNoticeVariant }) {
  return <PdpaNotice notice={SEEDSTACK_NOTICE} variant={variant} collapsedLabel="ข้อมูลที่ส่งให้พี่ mentor" />;
}
