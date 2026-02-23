import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Sponsorship Packages | The Next Decade Hackathon",
  description:
    "Partner with us to empower the next generation of innovators. Explore our Diamond, Platinum, Gold, and Silver sponsorship packages for the Futurist Fest.",
  openGraph: {
    title: "Sponsorship Packages | The Next Decade Hackathon",
    description:
      "Partner with us to empower the next generation of innovators. Explore our Diamond, Platinum, Gold, and Silver sponsorship packages for the Futurist Fest.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sponsorship Packages | The Next Decade Hackathon",
    description:
      "Partner with us to empower the next generation of innovators. Explore our Diamond, Platinum, Gold, and Silver sponsorship packages for the Futurist Fest.",
  },
};

export default function SponsorshipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-[#0B0415]">
      {/* Floating Back Button */}
      <div className="absolute top-6 left-6 z-50">
        <Link
          href="/hackathon"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-white/80 hover:text-white hover:bg-white/10 hover:scale-105 transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium tracking-wide">
            Back to Hackathon
          </span>
        </Link>
      </div>

      {/* Page Content */}
      {children}
    </div>
  );
}
