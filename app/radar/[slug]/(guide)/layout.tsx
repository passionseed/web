import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { GuideShellProvider } from "@/components/radar/guide/shell/GuideShellProvider";
import { guideVisible } from "@/lib/radar-guides";
import { guideIndexFor, loadGuide } from "@/lib/radar-guides/registry.server";

/**
 * The persistent game shell for every level of a code guide. A route group
 * layout: it wraps only `[page]`, so the shell (visit, progress, XP bar, level
 * map) survives level changes instead of remounting. Reads code only.
 */
export default async function GuideLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = loadGuide(slug);
  if (!guide || !guideVisible(guide.meta)) notFound();
  return <GuideShellProvider index={guideIndexFor(guide)}>{children}</GuideShellProvider>;
}
