import type { Metadata } from "next";
import { Ps01HandmadeGuide } from "@/components/merch/ps01/Ps01HandmadeGuide";

export const metadata: Metadata = {
  title: "PS[01] First 10",
  description: "How to make the first 10 PassionSeed PS[01] shirts: two print files and a print shop.",
  robots: { index: false, follow: false },
};

export default function Ps01HandmadePage() {
  return <Ps01HandmadeGuide />;
}
