import type { Metadata } from "next";

import { AudienceSegmentWorkspace } from "@/components/work/AudienceSegmentWorkspace";

export const metadata: Metadata = {
  title: "Segments & Worksheets | Work OS",
  description:
    "Student segments, their starved self-determination need, and the free worksheet that opens each conversation.",
};

export default function AudienceSegmentsPage() {
  return <AudienceSegmentWorkspace />;
}
