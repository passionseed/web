import type { Metadata } from "next";

import { GrowthModelWorkspace } from "@/components/work/GrowthModelWorkspace";

export const metadata: Metadata = {
  title: "Growth Model | Work OS",
  description:
    "The motivation ladder, the scaling arithmetic, and the business model PassionSeed is betting on.",
};

export default function GrowthModelPage() {
  return <GrowthModelWorkspace />;
}
