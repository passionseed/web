import type { Metadata } from "next";

import { AboutPage } from "@/components/about/AboutPage";
import { ABOUT_META } from "@/lib/content/about";
import { getHomeLead } from "@/lib/content/home-lead";

// The nav button and last call follow what is open today, not at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: ABOUT_META.title,
  description: ABOUT_META.description,
  alternates: { canonical: "/about" },
  openGraph: { title: `${ABOUT_META.title} | PassionSeed`, description: ABOUT_META.description, url: "/about" },
};

export default function About() {
  return <AboutPage lead={getHomeLead()} />;
}
