import type { Metadata } from "next";
import { PathlabNav } from "@/components/pathlab/PathlabNav";
import { PathlabHero } from "@/components/pathlab/PathlabHero";
import { PathlabPortfolio } from "@/components/pathlab/PathlabPortfolio";
import { PathlabProof } from "@/components/pathlab/PathlabProof";
import { PathlabJourney } from "@/components/pathlab/PathlabJourney";
import { PathlabStats } from "@/components/pathlab/PathlabStats";
import { PathlabOffer } from "@/components/pathlab/PathlabOffer";
import { PathlabReviews } from "@/components/pathlab/PathlabReviews";
import { PathlabFields } from "@/components/pathlab/PathlabFields";
import { PathlabPrice } from "@/components/pathlab/PathlabPrice";
import { PathlabContact } from "@/components/pathlab/PathlabContact";
import { PathlabMobileCta } from "@/components/pathlab/PathlabMobileCta";
import { MARQUEE_PHRASES } from "@/lib/content/pathlab-page";

const PATHLAB_TITLE = "Pathlab: ทำ Project จริงกับผู้เชี่ยวชาญ";
const PATHLAB_DESCRIPTION =
  "ทดสอบว่าทางนี้ใช่ทางของคุณไหม และเริ่มต้นเรียนรู้พื้นฐานของสายต่างๆ ผ่านการทำ Project ที่ออกแบบร่วมกับผู้เชี่ยวชาญ ภายในเวลา 4-6 วัน";

export const metadata: Metadata = {
  title: PATHLAB_TITLE,
  description: PATHLAB_DESCRIPTION,
  openGraph: {
    type: "website",
    title: PATHLAB_TITLE,
    description: PATHLAB_DESCRIPTION,
    siteName: "Passion Seed",
  },
  twitter: {
    card: "summary_large_image",
    title: PATHLAB_TITLE,
    description: PATHLAB_DESCRIPTION,
  },
};

export default function PathlabPage() {
  return (
    <main className="pathlab-page min-h-screen antialiased">
      <PathlabNav />

      {/* Marquee strip, same construction as /talent */}
      <div className="talent-marquee" aria-hidden="true">
        <div className="talent-marquee__track">
          {[0, 1].map((copy) => (
            <div key={copy} className="talent-marquee__group">
              {Array.from({ length: 4 }).flatMap((_, rep) =>
                MARQUEE_PHRASES.map((phrase) => (
                  <span
                    key={`${rep}-${phrase}`}
                    className="talent-marquee__item"
                  >
                    {phrase}
                  </span>
                ))
              )}
            </div>
          ))}
        </div>
      </div>

      {/*
        Section order follows the reader's first question — "มีสายที่เราอยาก
        เรียนไหม?" — so Fields comes straight after the hero, not near the
        footer. Portfolio → Stats → Offer keeps its narrative (what a port
        needs → starting is hard → Pathlab starts you), then Journey, proof,
        reviews, and the close.
      */}
      <PathlabHero />
      <PathlabFields />
      <PathlabPortfolio />
      <PathlabStats />
      <PathlabOffer />
      <PathlabJourney />
      <PathlabProof />
      <PathlabReviews />
      <PathlabPrice />
      <PathlabContact />
      <PathlabMobileCta />
    </main>
  );
}
