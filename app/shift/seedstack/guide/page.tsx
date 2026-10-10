import type { Metadata } from "next";

import { SeedstackGuide } from "@/components/shift/seedstack/SeedstackGuide";

export const metadata: Metadata = {
  title: "คู่มือ SeedStack | PassionSeed",
  robots: { index: false, follow: false },
};

export default function SeedstackGuidePage() {
  return <SeedstackGuide />;
}
