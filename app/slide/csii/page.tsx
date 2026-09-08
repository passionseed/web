import type { Metadata } from "next";
import { CsiiSlideDeck } from "@/components/slides/csii/CsiiSlideDeck";

export const metadata: Metadata = {
  title: "PassionSeed: CSII Project Slide Deck | BAScii 2026-2027",
  description:
    "Project overview, key objectives, milestones, and progress for the PassionSeed BAScii Capstone project at Chulalongkorn School of Integrated Innovation (CSII).",
};

export default function CsiiSlidePage() {
  return <CsiiSlideDeck />;
}
